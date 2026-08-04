import service from '../services/Dashboard.service.js';

const getIndicadores = async (_req, res) => {
    try {
        const indicadores = await service.getIndicadores();
        res.json(indicadores);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

const getKanban = async (_req, res) => {
    try {
        const kanban = await service.getKanban();
        res.json(kanban);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

const getActivityFeed = async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 20;
        const feed = await service.getActivityFeed(limit);
        res.json(feed);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

const getCalendarEvents = async (_req, res) => {
    try {
        const events = await service.getCalendarEvents();
        res.json(events);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

export default { getIndicadores, getKanban, getActivityFeed, getCalendarEvents };