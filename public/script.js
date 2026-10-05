document.getElementById("yr").textContent = new Date().getFullYear();

const form = document.getElementById("downloadForm");
const urlInput = document.getElementById("urlInput");
const submitBtn = document.getElementById("submitBtn");
const pasteBtn = document.getElementById("pasteBtn");
const results = {
    tiktok: document.getElementById("result-tiktok"),
    instagram: document.getElementById("result-instagram")
};
const tabs = {
    tiktok: document.getElementById("tiktokBtn"),
    instagram: document.getElementById("instagramBtn")
};
const savedUrl = { tiktok: "", instagram: "" };
const names = { tiktok: "TikTok", instagram: "Instagram" };
let platform = "tiktok";

const spinner = `<svg class="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>`;
const downloadIcon = `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>`;

const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));


function setPlatform(p) {
    if (p === platform) return;
    savedUrl[platform] = urlInput.value;
    platform = p;
    urlInput.value = savedUrl[p];
    urlInput.placeholder = `Tempel URL ${names[p]} di sini...`;

    for (const key in results) {
        results[key].classList.toggle("hidden", key !== p);
        tabs[key].classList.toggle("tab-active", key === p);
        tabs[key].setAttribute("aria-selected", key === p);
    }
}

tabs.tiktok.onclick = () => setPlatform("tiktok");
tabs.instagram.onclick = () => setPlatform("instagram");

pasteBtn.onclick = async () => {
    try { urlInput.value = await navigator.clipboard.readText(); } catch { }
    urlInput.focus();
};


function extractTikTok(data) {
    const out = [];
    const add = (url, label, nowm) => {
        if (typeof url === "string" && /^https?:\/\//.test(url) && !out.some(o => o.url === url))
            out.push({ url, label, nowm });
    };

    const list = data.formats || data.medias || data.links || data.data?.formats || [];
    if (Array.isArray(list)) {
        for (const f of list) {
            const tag = String(f.format ?? f.quality ?? f.type ?? f.label ?? "").toLowerCase();
            if (/audio|mp3|music/.test(tag)) continue;
            const wm = /(^|[^a-z])(wm|watermark)/.test(tag) && !/nowm|no.?watermark|tanpa/.test(tag);
            add(f.url ?? f.link ?? f.download_url, wm ? "Dengan watermark" : (/hd|high/.test(tag) ? "Tanpa watermark HD" : "Tanpa watermark"), !wm);
        }
    }

    const d = data.data || data;
    add(d.hdplay, "Tanpa watermark HD", true);
    add(d.nowm || d.no_watermark || d.play || d.video_no_watermark, "Tanpa watermark", true);
    add(d.wmplay || d.watermark || d.video_watermark, "Dengan watermark", false);
    add(typeof d.video === "string" ? d.video : d.video?.url, "Video", true);
    add(data.url, "Video", true);

    out.sort((a, b) => b.nowm - a.nowm);

    const total = {}, seen = {};
    out.forEach(o => total[o.label] = (total[o.label] || 0) + 1);
    out.forEach(o => {
        if (total[o.label] > 1) {
            seen[o.label] = (seen[o.label] || 0) + 1;
            o.label += ` (Server ${seen[o.label]})`;
        }
    });
    return out;
}

function extractMeta(data) {
    const m = data.meta || data.data?.meta || data.data || data;
    return {
        title: m.title || m.desc || m.description || "Video TikTok",
        thumb: m.thumbnail || m.cover || m.origin_cover || m.thumb || ""
    };
}

/* ---------- Unduh ---------- */

function saveBlob(blob, filename) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 10000);
}

async function directDownload(btn, url, filename) {
    const original = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = `${spinner}<span>Mengunduh...</span>`;

    try {
        const res = await fetch(url);
        if (!res.ok) throw new Error("HTTP " + res.status);
        saveBlob(await res.blob(), filename);
    } catch {
        // Fallback lewat proxy server jika diblokir CORS
        const a = document.createElement("a");
        a.href = `/api/proxy?url=${encodeURIComponent(url)}&name=${encodeURIComponent(filename)}`;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
    }

    btn.innerHTML = "Selesai diunduh";
    setTimeout(() => { btn.innerHTML = original; btn.disabled = false; }, 2500);
}

/* ---------- Tampilan hasil ---------- */

function notice(box, msg, tone = "red") {
    box.innerHTML = `<div class="p-4 rounded-[4px] bg-${tone}-500/10 border border-${tone}-500/20 text-${tone}-400 text-center text-sm font-medium">${esc(msg)}</div>`;
}

function renderResult(box, p, { title, thumb, items, kind }) {
    const ext = kind === "image" ? "jpg" : "mp4";

    let preview = "";
    if (thumb) {
        preview = `<div class="relative overflow-hidden rounded-[4px] border border-zinc-800">
            <img src="${esc(thumb)}" alt="Pratinjau" referrerpolicy="no-referrer" class="w-full h-52 object-cover">
            <div class="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent"></div>
            <p class="absolute bottom-3 left-3 right-3 text-xs font-medium text-zinc-100 line-clamp-2">${esc(title)}</p>
        </div>`;
    } else if (kind === "video") {
        preview = `<video src="${esc(items[0].url)}" controls playsinline class="w-full max-h-80 rounded-[4px] border border-zinc-800 bg-black"></video>`;
    }

    box.innerHTML = `
        <div class="pt-4 border-t border-zinc-800 space-y-3">
            ${preview}
            <div class="dl-list space-y-2"></div>
        </div>`;

    const list = box.querySelector(".dl-list");
    items.forEach((it, i) => {
        const b = document.createElement("button");
        b.type = "button";
        b.className = (i === 0
            ? "bg-white text-zinc-900 hover:bg-zinc-200"
            : "bg-zinc-800 text-zinc-200 hover:bg-zinc-700") +
            " w-full flex items-center justify-center gap-2 rounded-[4px] py-3 text-sm font-semibold transition disabled:opacity-70";
        b.innerHTML = `${downloadIcon}Unduh ${esc(it.label)}`;
        b.onclick = () => directDownload(b, it.url, `${p}-${Date.now()}${items.length > 1 ? "-" + (i + 1) : ""}.${ext}`);
        list.appendChild(b);
    });
}

/* ---------- Submit ---------- */

form.addEventListener("submit", async e => {
    e.preventDefault();
    const p = platform, box = results[p];
    submitBtn.disabled = true;
    submitBtn.innerHTML = `<span class="inline-flex items-center gap-2">${spinner}Memproses...</span>`;
    box.innerHTML = "";

    try {
        const res = await fetch(p === "tiktok" ? "/api/download" : "/api/instagram", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url: urlInput.value.trim() })
        });
        const data = await res.json();

        if (!data.success) return notice(box, "Gagal mengambil media. Pastikan link yang dimasukkan benar.");

        if (p === "tiktok") {
            const items = extractTikTok(data);
            if (!items.length) return notice(box, "Link video tidak ditemukan di respons server.", "amber");
            renderResult(box, p, { ...extractMeta(data), items, kind: "video" });
        } else {
            const medias = (data.medias || data.data?.medias || []).filter(m => m?.url);
            if (!medias.length) return notice(box, "Media Instagram tidak tersedia.", "amber");

            const items = medias.map((m, i) => {
                const type = m.type === "video" ? "video" : "gambar";
                return { url: m.url, label: medias.length > 1 ? `${type} ${i + 1}` : type };
            });
            const first = medias[0];
            renderResult(box, p, {
                title: "Instagram",
                thumb: first.type === "image" ? first.url : (first.thumbnail || ""),
                items,
                kind: first.type === "image" ? "image" : "video"
            });
        }
    } catch {
        notice(box, "Gagal terhubung ke server. Silakan coba lagi nanti.");
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = "Cari Media";
    }
});