import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Enable CORS
  app.enableCors();
  
  // Add health check endpoint
  app.use('/health', (req, res) => {
    res.json({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development'
    });
  });

  // Add test override endpoint (only in test mode)
  if (process.env.TEST_MODE === '1') {
    app.use('/__test__/override', (req, res) => {
      if (req.method === 'POST') {
        const { type, name, implementation } = req.body;
        
        // Apply override based on type
        switch (type) {
          case 'service':
            // Override service
            break;
          case 'repository':
            // Override repository
            break;
          default:
            res.status(400).json({ error: 'Unknown override type' });
            return;
        }
        
        res.json({ success: true });
      } else {
        res.status(404).json({ error: 'Not found' });
      }
    });
  }

  const port = process.env.PORT || 3000;
  await app.listen(port);
  
  console.log(`Server running on port ${port}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Test mode: ${process.env.TEST_MODE || 'disabled'}`);
}

bootstrap();
