const express = require("express");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config();

const app = express();

app.use(express.json());

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
});

async function normalizeUrl(raw) {
    const match = String(raw || "").match(/https?:\/\/[^\s]+/);
    if (!match) return null;

    let u = match[0].replace(/[.,;!?)]+$/, "");

    try {
        let host = new URL(u).hostname.toLowerCase();

        const shortHosts = ["vm.tiktok.com", "vt.tiktok.com"];
        const isShortPath =
            (host === "tiktok.com" || host.endsWith(".tiktok.com")) &&
            new URL(u).pathname.startsWith("/t/");

        if (shortHosts.includes(host) || isShortPath) {
            const r = await fetch(u, {
                redirect: "follow",
                headers: {
                    "User-Agent":
                        "Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36"
                }
            });
            u = r.url;
        }

        const parsed = new URL(u);
        parsed.search = "";
        parsed.hash = "";
        return parsed.toString();
    } catch {
        return u;
    }
}

function createHandler(platform, envName) {
    return async (req, res) => {
        try {
            const url = await normalizeUrl(req.body && req.body.url);

            if (!url) {
                return res.status(400).json({
                    success: false,
                    message: "Link tidak valid. Tempel link TikTok/Instagram yang benar."
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

if (!process.env.VERCEL) {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`Server berjalan di http://localhost:${PORT}`);
    });
}

module.exports = app;