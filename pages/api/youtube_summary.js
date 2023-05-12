// /pages/api/youtube_summary.js
import { summarizeVideo } from "../../lib/youtube-summary";

export default async function handler(req, res) {
    const videoId = req.query.videoId;

    if (videoId) {
        try {
            const { summary, translation } = await summarizeVideo(videoId);
            res.status(200).json({ summary, translation });
        } catch (error) {
            console.log(error);
            res.status(500).json({ error: error.message });
        }
    } else {
        res.status(400).json({ error: "Please provide a video ID" });
    }
}