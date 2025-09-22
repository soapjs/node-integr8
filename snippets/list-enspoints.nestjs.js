// scripts/list-routes-advanced.js
const { NestFactory } = require('@nestjs/core');
const { AppModule } = require('./app.module');
const { DiscoveryService } = require('@nestjs/core');

async function listRoutesAdvanced() {
  try {
    const app = await NestFactory.create(AppModule, {
      logger: false
    });
    
    const routes = [];
    const discoveryService = app.get(DiscoveryService);
    const controllers = discoveryService.getControllers();

    app.getHttpAdapter().getInstance()._router.stack.forEach(layer => {
      if (layer.route) {
        const methods = Object.keys(layer.route.methods);
        
        methods.forEach(method => {
          const route = {
            method: method.toUpperCase(),
            path: layer.route.path,
            controller: 'Unknown',
            middleware: [],
            params: [],
            description: ''
          };
          
          const handler = layer.route.stack[layer.route.stack.length - 1];
          if (handler && handler.name) {
            route.controller = handler.name.replace('bound ', '');
          }
          
          const pathParams = layer.route.path.match(/:([^/]+)/g);
          if (pathParams) {
            route.params = pathParams.map(param => param.substring(1));
          }
          
          try {
            const controller = controllers.find(c => 
              c.instance && c.instance.constructor.name === route.controller
            );
            
            if (controller) {
              route.description = 'Auto-discovered endpoint';
            }
          } catch (e) {
          }
          
          routes.push(route);
        });
      }
    });
    
    routes.sort((a, b) => {
      if (a.path === b.path) {
        return a.method.localeCompare(b.method);
      }
      return a.path.localeCompare(b.path);
    });
    
    console.log(JSON.stringify(routes, null, 2));
    await app.close();
    
  } catch (error) {
    console.error('Error listing routes:', error.message);
    process.exit(1);
  }
}

listRoutesAdvanced();

/*
// scripts/list-routes.js
const { NestFactory } = require('@nestjs/core');
const { AppModule } = require('./app.module');

async function listRoutes() {
  try {
const app = await NestFactory.create(AppModule, {
      logger: false 
    });

    const routes = [];

    app.getHttpAdapter().getInstance()._router.stack.forEach(layer => {
      if (layer.route) {
        const methods = Object.keys(layer.route.methods);
        methods.forEach(method => {
          const route = {
            method: method.toUpperCase(),
            path: layer.route.path,
            controller: 'Unknown',
            middleware: [],
            params: []
          };
              if (layer.route.stack && layer.route.stack.length > 0) {
            const handler = layer.route.stack[layer.route.stack.length - 1];
            if (handler.name) {
              route.controller = handler.name.replace('bound ', '');
            }
          }
              const pathParams = layer.route.path.match(/:([^/]+)/g);
          if (pathParams) {
            route.params = pathParams.map(param => param.substring(1));
          }
            routes.push(route);
        });
      }
    });

    routes.sort((a, b) => {
      if (a.path === b.path) {
        return a.method.localeCompare(b.method);
      }
      return a.path.localeCompare(b.path);
    });

    console.log(JSON.stringify(routes, null, 2));

    await app.close();
    
  } catch (error) {
    console.error('Error listing routes:', error.message);
    process.exit(1);
  }
}


listRoutes();
*/