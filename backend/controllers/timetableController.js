const TimeTable = require('../models/TimeTable');

// Helper function to convert time to minutes
const timeToMinutes = (timeStr) => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
};

// Check for time conflicts
const hasTimeConflict = (newItem, existingItems) => {
    for (let item of existingItems) {
        // Check if the same teacher is scheduled in another section at the same time
        if (item.teacher === newItem.teacher && item.day === newItem.day) {
            if ((newItem.startMinutes >= item.startMinutes && newItem.startMinutes < item.endMinutes) ||
                (newItem.endMinutes > item.startMinutes && newItem.endMinutes <= item.endMinutes) ||
                (newItem.startMinutes <= item.startMinutes && newItem.endMinutes >= item.endMinutes)) {
                return {
                    hasConflict: true,
                    message: `Teacher ${newItem.teacher} is already teaching in Section ${item.section} at this time!`
                };
            }
        }
        
        // Check for section-specific conflicts (same section, same time)
        if (item.section === newItem.section && item.day === newItem.day) {
            if ((newItem.startMinutes >= item.startMinutes && newItem.startMinutes < item.endMinutes) ||
                (newItem.endMinutes > item.startMinutes && newItem.endMinutes <= item.endMinutes) ||
                (newItem.startMinutes <= item.startMinutes && newItem.endMinutes >= item.endMinutes)) {
                return {
                    hasConflict: true,
                    message: `This time slot conflicts with an existing schedule item in Section ${item.section}!`
                };
            }
        }
    }
    return { hasConflict: false, message: "" };
};

// Get user's timetable
exports.getTimetable = async (req, res) => {
    try {
        let timetable = await TimeTable.findOne({ user: req.user._id });
        
        if (!timetable) {
            // Create empty timetable if none exists
            timetable = await TimeTable.create({
                user: req.user._id,
                scheduleItems: []
            });
        }

        res.json({
            success: true,
            data: {
                timetable: timetable.scheduleItems,
                lastUpdated: timetable.lastUpdated
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching timetable',
            error: error.message
        });
    }
};

// Add time slot
exports.addTimeSlot = async (req, res) => {
    try {
        const { subject, teacher, day, section, startTime, endTime, timeSlotLabel } = req.body;
        
        const startMinutes = timeToMinutes(startTime);
        const endMinutes = timeToMinutes(endTime);

        const newItem = {
            subject,
            teacher,
            day,
            section,
            startTime,
            endTime,
            timeSlotLabel,
            startMinutes,
            endMinutes
        };

        let timetable = await TimeTable.findOne({ user: req.user._id });
        
        if (!timetable) {
            timetable = await TimeTable.create({
                user: req.user._id,
                scheduleItems: [newItem]
            });
        } else {
            // Check for conflicts
            const conflictResult = hasTimeConflict(newItem, timetable.scheduleItems);
            if (conflictResult.hasConflict) {
                return res.status(400).json({
                    success: false,
                    message: conflictResult.message,
                    hasConflict: true
                });
            }

            // Add new item
            timetable.scheduleItems.push(newItem);
            timetable.lastUpdated = new Date();
            await timetable.save();
        }

        res.json({
            success: true,
            message: 'Time slot added successfully',
            data: {
                timetable: timetable.scheduleItems
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error adding time slot',
            error: error.message
        });
    }
};

// Remove time slot
exports.removeTimeSlot = async (req, res) => {
    try {
        const { slotId } = req.params;

        const timetable = await TimeTable.findOne({ user: req.user._id });
        if (!timetable) {
            return res.status(404).json({
                success: false,
                message: 'Timetable not found'
            });
        }

        timetable.scheduleItems = timetable.scheduleItems.filter(
            item => item._id.toString() !== slotId
        );
        
        timetable.lastUpdated = new Date();
        await timetable.save();

        res.json({
            success: true,
            message: 'Time slot removed successfully',
            data: {
                timetable: timetable.scheduleItems
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error removing time slot',
            error: error.message
        });
    }
};

// Clear timetable
exports.clearTimetable = async (req, res) => {
    try {
        const timetable = await TimeTable.findOne({ user: req.user._id });
        if (!timetable) {
            return res.status(404).json({
                success: false,
                message: 'Timetable not found'
            });
        }

        timetable.scheduleItems = [];
        timetable.lastUpdated = new Date();
        await timetable.save();

        res.json({
            success: true,
            message: 'Timetable cleared successfully',
            data: {
                timetable: timetable.scheduleItems
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error clearing timetable',
            error: error.message
        });
    }
};

// Update time slot
exports.updateTimeSlot = async (req, res) => {
    try {
        const { slotId } = req.params;
        const updates = req.body;

        const timetable = await TimeTable.findOne({ user: req.user._id });
        if (!timetable) {
            return res.status(404).json({
                success: false,
                message: 'Timetable not found'
            });
        }

        const slotIndex = timetable.scheduleItems.findIndex(
            item => item._id.toString() === slotId
        );

        if (slotIndex === -1) {
            return res.status(404).json({
                success: false,
                message: 'Time slot not found'
            });
        }

        // Apply updates
        Object.assign(timetable.scheduleItems[slotIndex], updates);
        
        // Recalculate minutes if time changed
        if (updates.startTime || updates.endTime) {
            const item = timetable.scheduleItems[slotIndex];
            item.startMinutes = timeToMinutes(item.startTime);
            item.endMinutes = timeToMinutes(item.endTime);
        }

        // Check for conflicts with other items
        const updatedItem = timetable.scheduleItems[slotIndex];
        const otherItems = timetable.scheduleItems.filter((_, index) => index !== slotIndex);
        
        const conflictResult = hasTimeConflict(updatedItem, otherItems);
        if (conflictResult.hasConflict) {
            return res.status(400).json({
                success: false,
                message: conflictResult.message,
                hasConflict: true
            });
        }

        timetable.lastUpdated = new Date();
        await timetable.save();

        res.json({
            success: true,
            message: 'Time slot updated successfully',
            data: {
                timetable: timetable.scheduleItems
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error updating time slot',
            error: error.message
        });
    }
};