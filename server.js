const express = require("express");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config();

const app = express();

app.use(express.json());

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
});

function createHandler(platform, envName) {
    return async (req, res) => {
        try {
            const { url } = req.body;

            if (!url) {
                return res.status(400).json({
                    success: false,
                    message: "URL wajib diisi"
                });
            }

            const apiKey = process.env[envName];
            if (!apiKey) {
                return res.status(500).json({
                    success: false,
                    message: `${envName} tidak ditemukan di environment variable`
                });
            }

            const response = await fetch(
                `https://api.saveapi.org/v1/${platform}?url=${encodeURIComponent(url)}`,
                {
                    headers: { Authorization: `Bearer ${apiKey}` }
                }
            );

            const data = await response.json();
            res.status(response.status).json(data);
        } catch (error) {
            console.error(`${platform} error:`, error);
            res.status(500).json({
                success: false,
                message: "Terjadi kesalahan pada server"
            });
        }
    };
}

app.post("/api/download", createHandler("tiktok", "SAVEAPI_KEY"));
app.post("/api/instagram", createHandler("instagram", "INSTAGRAM_API_KEY"));

// Jalankan listen hanya di lokal, bukan di Vercel
if (!process.env.VERCEL) {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`Server berjalan di http://localhost:${PORT}`);
    });
}

module.exports = app;