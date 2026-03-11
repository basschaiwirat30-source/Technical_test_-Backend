require('dotenv').config();
const bcrypt = require('bcryptjs');
const { sequelize } = require('../models');
const { User, Currency, Wallet, PaymentMethod } = require('../models');

const seedData = async () => {
  try {
    console.log('Starting database seeding...');
    
    // Sync database (this will create tables if they don't exist)
    await sequelize.sync({ force: true });
    console.log('Database synchronized successfully.');

    // Seed currencies
    console.log('Seeding currencies...');
    const currencies = await Currency.bulkCreate([
      {
        symbol: 'BTC',
        name: 'Bitcoin',
        type: 'crypto',
        current_price_usd: 45000.00,
        current_price_thb: 1575000.00
      },
      {
        symbol: 'ETH',
        name: 'Ethereum',
        type: 'crypto',
        current_price_usd: 3000.00,
        current_price_thb: 105000.00
      },
      {
        symbol: 'XRP',
        name: 'Ripple',
        type: 'crypto',
        current_price_usd: 0.60,
        current_price_thb: 21.00
      },
      {
        symbol: 'DOGE',
        name: 'Dogecoin',
        type: 'crypto',
        current_price_usd: 0.08,
        current_price_thb: 2.80
      },
      {
        symbol: 'USD',
        name: 'US Dollar',
        type: 'fiat',
        current_price_usd: 1.00,
        current_price_thb: 35.00
      },
      {
        symbol: 'THB',
        name: 'Thai Baht',
        type: 'fiat',
        current_price_usd: 0.0286,
        current_price_thb: 1.00
      }
    ]);

    console.log(`Created ${currencies.length} currencies.`);

    // Seed users
    console.log('Seeding users...');
    const users = await User.bulkCreate([
      {
        username: 'admin',
        email: 'admin@cryptoexchange.com',
        password_hash: await bcrypt.hash('admin123', 12),
        first_name: 'Admin',
        last_name: 'User',
        phone: '+66123456789',
        verification_status: 'verified'
      },
      {
        username: 'trader1',
        email: 'trader1@example.com',
        password_hash: await bcrypt.hash('password123', 12),
        first_name: 'John',
        last_name: 'Doe',
        phone: '+66223456789',
        verification_status: 'verified'
      },
      {
        username: 'trader2',
        email: 'trader2@example.com',
        password_hash: await bcrypt.hash('password123', 12),
        first_name: 'Jane',
        last_name: 'Smith',
        phone: '+66334567890',
        verification_status: 'verified'
      },
      {
        username: 'buyer1',
        email: 'buyer1@example.com',
        password_hash: await bcrypt.hash('password123', 12),
        first_name: 'Alice',
        last_name: 'Johnson',
        phone: '+66445678901',
        verification_status: 'verified'
      },
      {
        username: 'seller1',
        email: 'seller1@example.com',
        password_hash: await bcrypt.hash('password123', 12),
        first_name: 'Bob',
        last_name: 'Wilson',
        phone: '+66556789012',
        verification_status: 'pending'
      }
    ]);

    console.log(`Created ${users.length} users.`);

    // Seed wallets for each user
    console.log('Seeding wallets...');
    const wallets = [];
    
    for (const user of users) {
      // Give each user wallets for all currencies
      for (const currency of currencies) {
        let balance = 0;
        
        // Set some initial balances for testing
        if (currency.symbol === 'THB') {
          balance = Math.random() * 100000 + 10000; // 10,000 - 110,000 THB
        } else if (currency.symbol === 'USD') {
          balance = Math.random() * 5000 + 500; // 500 - 5,500 USD
        } else if (currency.symbol === 'BTC') {
          balance = Math.random() * 2 + 0.1; // 0.1 - 2.1 BTC
        } else if (currency.symbol === 'ETH') {
          balance = Math.random() * 10 + 1; // 1 - 11 ETH
        } else if (currency.symbol === 'XRP') {
          balance = Math.random() * 10000 + 1000; // 1,000 - 11,000 XRP
        } else if (currency.symbol === 'DOGE') {
          balance = Math.random() * 50000 + 5000; // 5,000 - 55,000 DOGE
        }
        
        wallets.push({
          user_id: user.id,
          currency_id: currency.id,
          balance: balance.toFixed(8),
          wallet_address: currency.type === 'crypto' ? `addr_${user.username}_${currency.symbol.toLowerCase()}` : null
        });
      }
    }
    
    await Wallet.bulkCreate(wallets);
    console.log(`Created ${wallets.length} wallets.`);

    // Seed payment methods
    console.log('Seeding payment methods...');
    const paymentMethods = [];
    
    users.forEach(user => {
      paymentMethods.push({
        user_id: user.id,
        method_type: 'bank_account',
        provider: 'Kasikorn Bank',
        account_number: `123456789${user.id}`,
        account_name: `${user.first_name} ${user.last_name}`
      });
      
      paymentMethods.push({
        user_id: user.id,
        method_type: 'mobile_banking',
        provider: 'TrueMoney',
        account_number: `098765432${user.id}`,
        account_name: `${user.first_name} ${user.last_name}`
      });
    });
    
    await PaymentMethod.bulkCreate(paymentMethods);
    console.log(`Created ${paymentMethods.length} payment methods.`);

    console.log('Database seeding completed successfully!');
    console.log('\n=== Test Users ===');
    users.forEach(user => {
      console.log(`Username: ${user.username}, Email: ${user.email}, Password: password123`);
    });
    console.log('\nAdmin user has password: admin123');
    
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
};

// Run the seed function
seedData();
