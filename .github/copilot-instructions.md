# Micro-Livraria Copilot Instructions

## Architecture Overview

**Micro-Livraria** is a microservices-based bookstore system with four independent services:

1. **Frontend** (port 5000): Web UI built with vanilla HTML/CSS/JS
2. **Controller** (port 3000): REST API gateway that orchestrates backend services
3. **Inventory** (port 3002): gRPC service managing product catalog
4. **Shipping** (port 3001): gRPC service calculating shipping rates
5. **Review** (port 3003): gRPC service handling product reviews

### Communication Patterns

- **Frontend ↔ Controller**: REST API via HTTP
- **Controller ↔ Backend Services**: gRPC (via Protocol Buffers)
- All gRPC services are insecure (no TLS) and use callback-based async patterns

## Project Structure

```
services/
  controller/
    index.js         # Express REST gateway with CORS
    shipping.js      # gRPC client stub for shipping
    inventory.js     # gRPC client stub for inventory
    review.js        # gRPC client stub for reviews
  inventory/
    index.js         # gRPC server (loads proto, serves data)
    products.json    # Static product data
  shipping/
    index.js         # gRPC server (generates random shipping rates)
  review/
    index.js         # gRPC server (in-memory review storage)
  frontend/
    index.html       # Main UI entry point
    index.js         # Client-side service calls
    index.css        # Styling
proto/
    *.proto          # Service definitions (Protocol Buffers)
```

## Key Patterns

### gRPC Service Pattern

Every backend service follows this structure:

1. Load `.proto` file with `protoLoader.loadSync()` (with `keepCase: true` for camelCase)
2. Create gRPC server and register service with `server.addService()`
3. Implement service methods with `(call, callback)` signature
4. Call `server.bindAsync()` on `0.0.0.0:PORT` with insecure credentials

**Example from `services/shipping/index.js`:**
```javascript
server.addService(shippingProto.ShippingService.service, {
    GetShippingRate: (_, callback) => {
        callback(null, { value: Math.random() * 100 + 1 });
    },
});
server.bindAsync('0.0.0.0:3001', grpc.ServerCredentials.createInsecure(), () => {...});
```

### REST Gateway Pattern

Controller exposes REST endpoints that delegate to gRPC services:

```javascript
app.get('/products', (req, res, next) => {
    inventory.SearchAllProducts(null, (err, data) => {
        if (err) {
            res.status(500).send({ error: 'something failed :(' });
        } else {
            res.json(data.products);
        }
    }); 
});
```

**Port mapping:**
- Inventory client calls `127.0.0.1:3002`
- Shipping client calls `127.0.0.1:3001`
- Review client calls `127.0.0.1:3003`

### Protocol Buffer Conventions

- All service definitions in `proto/` use `syntax = "proto3"`
- Message field numbering starts at 1 (must match between .proto and implementation)
- Use `repeated` for arrays (e.g., `repeated ProductResponse products = 1`)
- Service RPC methods use request/response message types, not primitives

## Development Workflow

### Starting Services

```bash
npm install          # Install dependencies once
npm start            # Runs all services with hot-reload (nodemon)
npm run exec         # Runs services without hot-reload (for production testing)
```

Services listen on:
- Frontend: http://127.0.0.1:5000
- Controller: http://127.0.0.1:3000
- Proxy redirects: http://127.0.0.1:8080 → frontend + /api → controller

Access the UI at http://127.0.0.1:8080

### Available npm Scripts

- `start`: All services with nodemon (for development)
- `start-controller`, `start-shipping`, `start-inventory`, `start-review`: Individual services with hot-reload
- `exec-*`: Individual services without hot-reload
- `start-frontend`: Serve static files
- `start-proxy`: HTTP proxy for unified entry point

## Common Tasks

### Adding a New gRPC Method

1. **Define in `.proto` file:**
   ```protobuf
   service InventoryService {
       rpc SearchAllProducts(Empty) returns (ProductsResponse) {}
       rpc NewMethod(InputMsg) returns (OutputMsg) {}  // ← Add here
   }
   ```

2. **Implement in service `index.js`:**
   ```javascript
   server.addService(inventoryProto.InventoryService.service, {
       NewMethod: (call, callback) => {
           // Implementation
           callback(null, result);
       },
   });
   ```

3. **Add gRPC client in controller if calling from REST:**
   ```javascript
   const newMethodStub = inventoryProto.InventoryService('127.0.0.1:3002', grpc.credentials.createInsecure());
   newMethodStub.NewMethod(payload, (err, response) => {...});
   ```

### Adding a New REST Endpoint

1. Add Express route in `services/controller/index.js`
2. Call appropriate gRPC service method via client stub
3. Handle errors and transform response to JSON
4. Use port 3000 for controller (already set up via npm proxy)

### Updating Proto Definitions

- Changes to `.proto` files take effect automatically in Node.js (no compilation step)
- Ensure field numbers don't change (they're part of the wire format)
- Always test both client and server when modifying message types

## Testing Conventions

- Frontend calls Controller REST endpoints: `GET /api/products`, `GET /api/shipping/:cep`
- gRPC services use callback pattern: errors in first parameter, data in second
- No external dependencies: all data is in-memory (products.json, review array)

## Important Notes

- **No TypeScript**: Codebase is pure JavaScript for simplicity
- **In-memory data**: Shipping rates are random; reviews are ephemeral (lost on restart)
- **Portuguese in code**: Comments and variable names use Portuguese (product names, service descriptions)
- **Didactic project**: Designed for teaching microservices - not production-ready
- **CORS enabled**: Controller includes CORS middleware for local frontend testing
