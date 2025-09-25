const express = require('express');
const { body } = require('express-validator');
const {
    getTimetable,
    addTimeSlot,
    removeTimeSlot,
    clearTimetable,
    updateTimeSlot
} = require('../controllers/timetableController');
const auth = require('../middleware/auth');
const { handleValidationErrors } = require('../middleware/validation');

const router = express.Router();

// Validation rules
const timeSlotValidation = [
    body('subject')
        .notEmpty()
        .withMessage('Subject name is required'),
    body('teacher')
        .notEmpty()
        .withMessage('Teacher name is required'),
    body('day')
        .isIn(['Mon', 'Tue', 'Wed', 'Thu', 'Fri'])
        .withMessage('Invalid day'),
    body('section')
        .isIn(['B', 'D'])
        .withMessage('Invalid section'),
    body('startTime')
        .notEmpty()
        .withMessage('Start time is required'),
    body('endTime')
        .notEmpty()
        .withMessage('End time is required')
];

// All routes protected by auth middleware
router.use(auth);

router.get('/', getTimetable);
router.post('/slots', timeSlotValidation, handleValidationErrors, addTimeSlot);
router.delete('/slots/:slotId', removeTimeSlot);
router.delete('/clear', clearTimetable);
router.put('/slots/:slotId', timeSlotValidation, handleValidationErrors, updateTimeSlot);

module.exports = router;