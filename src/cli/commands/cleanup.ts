import { Command } from 'commander';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export const cleanupCommand = new Command()
  .name('cleanup')
  .description('Clean up orphaned Integr8 containers and networks')
  .option('-f, --force', 'Force removal without confirmation')
  .action(async (options) => {
    console.log('🧹 Cleaning up Integr8 containers and networks...');
    
    try {
      // Find all Integr8 containers (those with worker_ in the name)
      const { stdout: containers } = await execAsync(
        'docker ps -a --filter name=worker_ --format "{{.Names}}"'
      );
      
      const containerNames = containers.trim().split('\n').filter(name => name.trim());
      
      if (containerNames.length === 0) {
        console.log('✅ No Integr8 containers found to clean up');
      } else {
        console.log(`Found ${containerNames.length} Integr8 containers:`);
        containerNames.forEach(name => console.log(`  - ${name}`));
        
        if (!options.force) {
          const { default: inquirer } = await import('inquirer');
          const { confirm } = await inquirer.prompt([
            {
              type: 'confirm',
              name: 'confirm',
              message: 'Do you want to remove these containers?',
              default: false
            }
          ]);
          
          if (!confirm) {
            console.log('❌ Cleanup cancelled');
            return;
          }
        }
        
        // Stop and remove containers
        for (const containerName of containerNames) {
          try {
            console.log(`🛑 Stopping container: ${containerName}`);
            await execAsync(`docker stop ${containerName}`);
          } catch (error) {
            console.log(`⚠️  Container ${containerName} already stopped`);
          }
          
          try {
            console.log(`🗑️  Removing container: ${containerName}`);
            await execAsync(`docker rm ${containerName}`);
            console.log(`✅ Removed: ${containerName}`);
          } catch (error) {
            console.log(`❌ Failed to remove ${containerName}:`, error instanceof Error ? error.message : String(error));
          }
        }
      }
      
      // Clean up networks
      try {
        const { stdout: networks } = await execAsync(
          'docker network ls --filter name=testcontainers --format "{{.Name}}"'
        );
        
        const networkNames = networks.trim().split('\n').filter(name => name.trim());
        
        if (networkNames.length > 0) {
          console.log(`\nFound ${networkNames.length} testcontainers networks:`);
          networkNames.forEach(name => console.log(`  - ${name}`));
          
          for (const networkName of networkNames) {
            try {
              console.log(`🗑️  Removing network: ${networkName}`);
              await execAsync(`docker network rm ${networkName}`);
              console.log(`✅ Removed network: ${networkName}`);
            } catch (error) {
              console.log(`⚠️  Failed to remove network ${networkName}:`, error instanceof Error ? error.message : String(error));
            }
          }
        } else {
          console.log('✅ No testcontainers networks found to clean up');
        }
      } catch (error) {
        console.log('⚠️  Failed to list networks:', error instanceof Error ? error.message : String(error));
      }
      
      // Clean up unused volumes
      try {
        console.log('\n🧹 Cleaning up unused Docker volumes...');
        await execAsync('docker volume prune -f');
        console.log('✅ Unused volumes cleaned up');
      } catch (error) {
        console.log('⚠️  Failed to clean up volumes:', error instanceof Error ? error.message : String(error));
      }
      
      console.log('\n✅ Cleanup completed!');
      
    } catch (error) {
      console.error('❌ Error during cleanup:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });
