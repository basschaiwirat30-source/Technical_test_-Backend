const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const { User } = require('../models');

// Protected routes
router.get('/search', auth, async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q || q.length < 2) {
      return res.status(400).json({ error: 'Search query must be at least 2 characters' });
    }

    const users = await User.findAll({
      where: {
        username: {
          [User.sequelize.Sequelize.Op.like]: `%${q}%`
        },
        is_active: true,
        id: {
          [User.sequelize.Sequelize.Op.ne]: req.user.id
        }
      },
      attributes: ['id', 'username', 'first_name', 'last_name', 'verification_status'],
      limit: 10
    });

    res.json({ users });
  } catch (error) {
    console.error('Search users error:', error);
    res.status(500).json({ error: 'Failed to search users' });
  }
});

router.get('/:userId', auth, async (req, res) => {
  try {
    const { userId } = req.params;
    
    const user = await User.findByPk(userId, {
      attributes: ['id', 'username', 'first_name', 'last_name', 'verification_status', 'created_at']
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

module.exports = router;
