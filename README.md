# Cryptocurrency Exchange System

A Node.js-based cryptocurrency exchange system with P2P trading capabilities, similar to Binance C2C. The system supports both cryptocurrency and fiat currency trading with comprehensive order management, wallet functionality, and transfer capabilities.

## Features

- **User Management**: Registration, authentication, and profile management
- **Multi-Currency Support**: Bitcoin (BTC), Ethereum (ETH), Ripple (XRP), Dogecoin (DOGE), and fiat currencies (THB, USD)
- **Wallet System**: Individual wallets for each currency per user
- **P2P Trading**: Buy/sell orders with automatic matching
- **Order Management**: Create, view, and cancel orders
- **Transfers**: Internal user-to-user and external blockchain transfers
- **Transaction History**: Comprehensive tracking of all trades and transfers
- **Market Statistics**: Real-time market data and user trading statistics
- **Payment Methods**: Support for multiple payment options
- **Security**: JWT authentication, password hashing, and rate limiting

## ER Diagram

The system is designed with the following main entities:

- **Users**: Central user accounts with authentication
- **Wallets**: User balances for different currencies
- **Currencies**: Master list of supported cryptocurrencies and fiat
- **Orders**: Buy/sell orders for P2P trading
- **Transactions**: Records of completed trades
- **Transfers**: Internal and external cryptocurrency transfers
- **Trade History**: Historical record of all completed trades
- **Payment Methods**: User's configured payment options

See `ER_Diagram.md` for detailed entity relationships.

## Prerequisites

- Node.js (v14 or higher)
- MySQL (v5.7 or higher)
- npm or yarn

## Installation

### 1. Clone the Repository

```bash
git clone <repository-url>
cd Technical_test_-Backend
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Database Setup

Create a MySQL database for the application:

```sql
CREATE DATABASE crypto_exchange CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 4. Environment Configuration

Copy the example environment file and configure your settings:

```bash
cp .env.example .env
```

Edit `.env` with your database and application settings:

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_NAME=crypto_exchange
DB_USER=your_mysql_username
DB_PASSWORD=your_mysql_password

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_here
JWT_EXPIRES_IN=24h

# Server Configuration
PORT=3000
NODE_ENV=development

# API Configuration
API_RATE_LIMIT=100
API_WINDOW_MS=900000
```

### 5. Database Seeding

Run the seed script to create initial data:

```bash
npm run seed
```

This will create:
- 6 currencies (BTC, ETH, XRP, DOGE, USD, THB)
- 5 test users with wallets
- Payment methods for each user

**Test Users:**
- Username: `admin`, Email: `admin@cryptoexchange.com`, Password: `admin123`
- Username: `trader1`, Email: `trader1@example.com`, Password: `password123`
- Username: `trader2`, Email: `trader2@example.com`, Password: `password123`
- Username: `buyer1`, Email: `buyer1@example.com`, Password: `password123`
- Username: `seller1`, Email: `seller1@example.com`, Password: `password123`

### 6. Start the Application

For development:
```bash
npm run dev
```

For production:
```bash
npm start
```

The server will start on `http://localhost:3000`

## API Endpoints

### Authentication

- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `GET /api/auth/profile` - Get user profile (protected)
- `PUT /api/auth/profile` - Update user profile (protected)

### Wallets

- `GET /api/wallets` - Get user wallets (protected)
- `GET /api/wallets/portfolio` - Get portfolio summary (protected)
- `GET /api/wallets/:currencySymbol` - Get specific wallet (protected)
- `POST /api/wallets` - Create new wallet (protected)

### Orders

- `GET /api/orders` - Get all orders (public)
- `GET /api/orders/book/:currency_symbol` - Get order book for currency (public)
- `POST /api/orders` - Create new order (protected)
- `GET /api/orders/user` - Get user orders (protected)
- `PUT /api/orders/:orderId/cancel` - Cancel order (protected)

### Transactions

- `GET /api/transactions` - Get user transactions (protected)
- `GET /api/transactions/:transactionId` - Get specific transaction (protected)
- `GET /api/transactions/history` - Get trade history (protected)
- `GET /api/transactions/stats/market` - Get market statistics (protected)
- `GET /api/transactions/stats/user` - Get user trading statistics (protected)

### Transfers

- `POST /api/transfers/internal` - Create internal transfer (protected)
- `POST /api/transfers/external` - Create external transfer (protected)
- `GET /api/transfers` - Get user transfers (protected)
- `GET /api/transfers/:transferId` - Get specific transfer (protected)

### Users

- `GET /api/users/search?q=query` - Search users (protected)
- `GET /api/users/:userId` - Get user details (protected)

### Health Check

- `GET /api/health` - Server health check

## API Usage Examples

### Register a New User

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "newuser",
    "email": "newuser@example.com",
    "password": "password123",
    "first_name": "New",
    "last_name": "User"
  }'
```

### Login

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "trader1@example.com",
    "password": "password123"
  }'
```

### Create a Buy Order

```bash
curl -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "currency_symbol": "BTC",
    "order_type": "buy",
    "amount": 0.1,
    "price": 45000,
    "payment_method": "bank_transfer"
  }'
```

### Get Order Book

```bash
curl -X GET http://localhost:3000/api/orders/book/BTC
```

### Create Internal Transfer

```bash
curl -X POST http://localhost:3000/api/transfers/internal \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "to_username": "trader2",
    "currency_symbol": "BTC",
    "amount": 0.01
  }'
```

## Database Schema

The application uses the following main tables:

- `users` - User accounts and authentication
- `currencies` - Supported currencies with current prices
- `wallets` - User wallet balances
- `orders` - Buy/sell orders
- `transactions` - Completed trade transactions
- `transfers` - Internal and external transfers
- `trade_histories` - Historical trade records
- `payment_methods` - User payment options

## Security Features

- **JWT Authentication**: Secure token-based authentication
- **Password Hashing**: bcrypt for secure password storage
- **Rate Limiting**: Prevents API abuse
- **Input Validation**: Joi schema validation for all inputs
- **CORS Protection**: Configurable cross-origin resource sharing
- **Helmet.js**: Security headers for Express applications

## Development

### Project Structure

```
├── config/
│   └── database.js          # Database configuration
├── controllers/
│   ├── authController.js    # Authentication logic
│   ├── orderController.js   # Order management
│   ├── transactionController.js # Transaction handling
│   ├── transferController.js    # Transfer operations
│   └── walletController.js  # Wallet management
├── middleware/
│   └── auth.js              # Authentication middleware
├── models/
│   ├── User.js              # User model
│   ├── Currency.js          # Currency model
│   ├── Wallet.js            # Wallet model
│   ├── Order.js             # Order model
│   ├── Transaction.js       # Transaction model
│   ├── Transfer.js          # Transfer model
│   ├── TradeHistory.js      # Trade history model
│   ├── PaymentMethod.js     # Payment method model
│   └── index.js             # Model associations
├── routes/
│   ├── auth.js              # Authentication routes
│   ├── users.js             # User routes
│   ├── wallets.js           # Wallet routes
│   ├── orders.js            # Order routes
│   ├── transactions.js      # Transaction routes
│   └── transfers.js         # Transfer routes
├── seeds/
│   └── seed.js              # Database seeding script
├── server.js                # Main application file
├── package.json             # Dependencies and scripts
├── .env.example             # Environment variables template
└── README.md                # This file
```

### Running Tests

```bash
npm test
```

### Database Migrations

The application uses Sequelize for database management. Tables are automatically created when the server starts.

## Production Deployment

### Environment Variables

For production, ensure the following environment variables are set:

- `NODE_ENV=production`
- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`
- `JWT_SECRET` (use a strong, random secret)
- `PORT` (default: 3000)

### Security Considerations

1. Use HTTPS in production
2. Set strong JWT secrets
3. Configure proper database access
4. Implement proper logging and monitoring
5. Use environment variables for sensitive data
6. Regularly update dependencies

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support and questions, please open an issue in the repository.

---

**Note**: This is a demonstration project for educational purposes. For production use, additional security measures, testing, and optimization would be required.
