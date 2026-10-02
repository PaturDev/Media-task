const express = require("express");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config();

const app = express();

app.use(express.json());

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
});

console.log("TikTok API Key:", process.env.SAVEAPI_KEY ? "TERBACA" : "TIDAK TERBACA");
console.log("Instagram API Key:", process.env.INSTAGRAM_API_KEY ? "TERBACA" : "TIDAK TERBACA");

app.post("/api/download", async (req, res) => {
    try {
        const { url } = req.body;

        if (!process.env.SAVEAPI_KEY) {
            return res.status(500).json({
                success: false,
                message: "SAVEAPI_KEY tidak ditemukan di .env"
            });
        }

        const response = await fetch(
            `https://api.saveapi.org/v1/tiktok?url=${encodeURIComponent(url)}`,
            {
                headers: {
                    Authorization: `Bearer ${process.env.SAVEAPI_KEY}`
                }
            }
        );

        const data = await response.json();

        console.log("TikTok response:", data);

        res.status(response.status).json(data);

    } catch (error) {
        console.error("TikTok error:", error);

        res.status(500).json({
            success: false,
            message: "Terjadi kesalahan pada server"
        });
    }
});

app.post("/api/instagram", async (req, res) => {
    try {
        const { url } = req.body;

        if (!process.env.INSTAGRAM_API_KEY) {
            return res.status(500).json({
                success: false,
                message: "INSTAGRAM_API_KEY tidak ditemukan di .env"
            });
        }

        const response = await fetch(
            `https://api.saveapi.org/v1/instagram?url=${encodeURIComponent(url)}`,
            {
                headers: {
                    Authorization: `Bearer ${process.env.INSTAGRAM_API_KEY}`
                }
            }
        );

        const data = await response.json();

        console.log("Instagram response:", data);

        res.status(response.status).json(data);

    } catch (error) {
        console.error("Instagram error:", error);

        res.status(500).json({
            success: false,
            message: "Terjadi kesalahan pada server"
        });
    }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server berjalan di http://localhost:${PORT}`);
});