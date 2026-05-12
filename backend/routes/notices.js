const express = require('express');
const router = express.Router();
const Notice = require('../models/Notice');
const { protect, authorize } = require('../middleware/auth');

router.get('/', protect, async (req, res) => {
    try {
        const notices = await Notice.find().sort({ createdAt: -1 });
        res.json({ success: true, notices });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.post('/', protect, authorize('admin'), async (req, res) => {
    try {
        const notice = new Notice({ ...req.body, createdBy: req.user.id });
        await notice.save();
        res.json({ success: true, notice });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.put('/:id', protect, authorize('admin'), async (req, res) => {
    try {
        const notice = await Notice.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json({ success: true, notice });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.delete('/:id', protect, authorize('admin'), async (req, res) => {
    try {
        await Notice.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;