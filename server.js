const express = require("express");
const dotenv = require("dotenv");
const path = require("path");
const { Readable } = require("stream");

dotenv.config();

const app = express();

app.use(express.json());

app.use(express.static(path.join(__dirname, "public")));

const UA =
    "Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36";

// Ambil URL dari teks, ikuti redirect link pendek/share, buang parameter tracking
async function normalizeUrl(raw) {
    const match = String(raw || "").match(/https?:\/\/[^\s]+/);
    if (!match) return null;

    let u = match[0].replace(/[.,;!?)]+$/, "");

    try {
        const first = new URL(u);
        const host = first.hostname.toLowerCase();
        const p = first.pathname;

        const isTikTokShort =
            host === "vm.tiktok.com" ||
            host === "vt.tiktok.com" ||
            ((host === "tiktok.com" || host.endsWith(".tiktok.com")) && p.startsWith("/t/"));

        const isInstaShare =
            (host === "instagram.com" || host.endsWith(".instagram.com")) &&
            p.startsWith("/share/");

        if (isTikTokShort || isInstaShare) {
            const r = await fetch(u, {
                redirect: "follow",
                headers: { "User-Agent": UA }
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
                { headers: { Authorization: `Bearer ${apiKey}` } }
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

const ALLOWED_HOSTS = [
    "tiktokcdn.com", "tiktokcdn-us.com", "tiktokv.com", "tiktokv.us",
    "byteoversea.com", "ibytedtos.com", "muscdn.com",
    "cdninstagram.com", "fbcdn.net", "saveapi.org"
];

app.get("/api/proxy", async (req, res) => {
    try {
        const target = new URL(String(req.query.url || ""));
        const host = target.hostname.toLowerCase();
        const allowed = ALLOWED_HOSTS.some(h => host === h || host.endsWith("." + h));

        if (target.protocol !== "https:" || !allowed) {
            return res.status(400).send("Host tidak diizinkan");
        }

        const upstream = await fetch(target, { headers: { "User-Agent": UA } });
        if (!upstream.ok || !upstream.body) {
            return res.status(502).send("Gagal mengambil file");
        }

        const name = String(req.query.name || "download").replace(/[^\w.\-]/g, "_");
        res.setHeader("Content-Type", upstream.headers.get("content-type") || "application/octet-stream");
        const len = upstream.headers.get("content-length");
        if (len) res.setHeader("Content-Length", len);
        res.setHeader("Content-Disposition", `attachment; filename="${name}"`);

        Readable.fromWeb(upstream.body).pipe(res);
    } catch {
        res.status(400).send("URL tidak valid");
    }
});

if (!process.env.VERCEL) {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`Server berjalan di http://localhost:${PORT}`);
    });
}

module.exports = app;