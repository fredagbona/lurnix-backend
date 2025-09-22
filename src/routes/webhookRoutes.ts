import express from 'express';
import { paddleWebhookService } from '../services/paddleWebhookService';
import { paddleConfig } from '../config/paddle';

const router = express.Router();

const jsonParser = express.json({ type: '*/*' });

router.post('/paddle', jsonParser, async (req, res, next) => {
  try {
    if (paddleConfig.webhookSecret) {
      const signature = req.header('Paddle-Signature');
      if (!signature || signature !== paddleConfig.webhookSecret) {
        res.status(401).json({ success: false, message: 'Invalid Paddle webhook signature' });
        return;
      }
    }

    await paddleWebhookService.handleEvent(req.body);

    res.status(200).json({ success: true });
  } catch (error) {
    next(error);
  }
});

export default router;
