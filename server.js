const express = require("express");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config();

const app = express();

app.use(express.json());
app.use(express.static(__dirname));

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
});

app.post("/api/download", async (req, res) => {
    try {
        const { url } = req.body;

        const response = await fetch(
            `https://api.saveapi.org/v1/tiktok?url=${encodeURIComponent(url)}`,
            {
                headers: {
                    Authorization: `Bearer ${process.env.SAVEAPI_KEY}`
                }
            }
        );

        const data = await response.json();

        res.status(response.status).json(data);
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Terjadi kesalahan pada server"
        });
    }
});

app.post("/api/instagram", async (req, res) => {
    try {
        const { url } = req.body;

        const response = await fetch(
            `https://api.saveapi.org/v1/instagram?url=${encodeURIComponent(url)}`,
            {
                headers: {
                    Authorization: `Bearer ${process.env.INSTAGRAM_API_KEY}`
                }
            }
        );

        const data = await response.json();

        res.status(response.status).json(data);
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Terjadi kesalahan pada server"
        });
    }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server berjalan di port ${PORT}`);
});