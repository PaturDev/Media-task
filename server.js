const express = require("express");
const dotenv = require("dotenv");

dotenv.config();

const app = express();

app.use(express.json());
app.use(express.static("public"));

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

app.listen(3000, () => {
    console.log("Server berjalan di http://localhost:3000");
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