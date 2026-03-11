# Cryptocurrency Exchange System - ER Diagram

## Entity Relationship Diagram

```mermaid
erDiagram
    USERS {
        int id PK
        string username
        string email
        string password_hash
        string first_name
        string last_name
        string phone
        datetime created_at
        datetime updated_at
        boolean is_active
        string verification_status
    }

    WALLETS {
        int id PK
        int user_id FK
        string currency_type
        decimal balance
        string wallet_address
        datetime created_at
        datetime updated_at
    }

    CURRENCIES {
        int id PK
        string symbol
        string name
        string type
        boolean is_active
        decimal current_price_usd
        decimal current_price_thb
        datetime updated_at
    }

    ORDERS {
        int id PK
        int user_id FK
        int currency_id FK
        string order_type
        decimal amount
        decimal price
        decimal total_value
        string status
        string payment_method
        datetime created_at
        datetime updated_at
        datetime expires_at
    }

    TRANSACTIONS {
        int id PK
        int order_id FK
        int from_user_id FK
        int to_user_id FK
        int currency_id FK
        decimal amount
        decimal price
        decimal fee
        string transaction_type
        string status
        string blockchain_tx_hash
        datetime created_at
        datetime completed_at
    }

    TRANSFERS {
        int id PK
        int from_user_id FK
        int to_user_id FK
        int currency_id FK
        decimal amount
        string transfer_type
        string status
        string external_address
        string blockchain_tx_hash
        decimal fee
        datetime created_at
        datetime completed_at
    }

    TRADE_HISTORY {
        int id PK
        int buyer_id FK
        int seller_id FK
        int currency_id FK
        decimal amount
        decimal price
        decimal total_value
        datetime trade_date
        string order_reference
    }

    PAYMENT_METHODS {
        int id PK
        int user_id FK
        string method_type
        string provider
        string account_number
        string account_name
        boolean is_active
        datetime created_at
        datetime updated_at
    }

    USERS ||--o{ WALLETS : owns
    USERS ||--o{ ORDERS : places
    USERS ||--o{ TRANSACTIONS : participates
    USERS ||--o{ TRANSFERS : sends/receives
    USERS ||--o{ TRADE_HISTORY : trades
    USERS ||--o{ PAYMENT_METHODS : has
    CURRENCIES ||--o{ WALLETS : supports
    CURRENCIES ||--o{ ORDERS : involves
    CURRENCIES ||--o{ TRANSACTIONS : involves
    CURRENCIES ||--o{ TRANSFERS : involves
    CURRENCIES ||--o{ TRADE_HISTORY : trades
    ORDERS ||--o{ TRANSACTIONS : generates
```

## Entity Descriptions

### Users
- Central entity for user accounts
- Stores authentication and profile information
- Links to all user activities

### Wallets
- User wallet balances for different currencies
- Supports both crypto and fiat currencies
- Each user can have multiple wallets for different currencies

### Currencies
- Master list of supported currencies
- Includes both cryptocurrencies (BTC, ETH, XRP, DOGE) and fiat (THB, USD)
- Stores current exchange rates

### Orders
- Buy/sell orders placed by users
- P2P trading orders similar to Binance C2C
- Includes order expiration and status tracking

### Transactions
- Records of completed trades
- Links buyers and sellers
- Includes transaction fees

### Transfers
- Internal and external cryptocurrency transfers
- Supports wallet-to-wallet and external address transfers
- Tracks blockchain transaction hashes

### Trade History
- Historical record of all completed trades
- Used for analytics and reporting

### Payment Methods
- User's configured payment methods for fiat transactions
- Bank accounts, mobile banking, etc.

## Key Relationships

1. **User to Wallet**: One-to-Many (each user has multiple currency wallets)
2. **User to Orders**: One-to-Many (users can place multiple orders)
3. **Order to Transactions**: One-to-Many (each order can generate multiple transactions)
4. **User to Transfers**: One-to-Many (users can send/receive multiple transfers)
5. **Currency to Wallet**: One-to-Many (each currency can be in multiple user wallets)

## Business Rules

1. Users must have a wallet for each currency they want to trade
2. Orders expire after a set time period
3. All transactions include a small fee
4. External transfers require blockchain confirmation
5. Users must verify their identity before trading
6. Each currency has a current market price for valuation
