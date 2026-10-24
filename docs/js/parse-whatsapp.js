/**
 * Official WhatsApp export parser (.txt or .zip containing .txt).
 * No scraping, no unofficial clients.
 */
(function (global) {
  const MSG_LINE = new RegExp(
    [
      // US / Android: 8/6/20, 3:45 PM - Sender: text
      "^(\\d{1,2}/\\d{1,2}/\\d{2,4}),\\s*(\\d{1,2}:\\d{2}(?::\\d{2})?[\\s\\u202f\\u00a0]*[APap][Mm])\\s*-\\s*([^:]+):\\s*(.*)$",
      // 24h: 8/6/20, 15:45 - Sender: text  OR  06/08/2020, 15:45 - Sender: text
      "^(\\d{1,2}/\\d{1,2}/\\d{2,4}),\\s*(\\d{1,2}:\\d{2}(?::\\d{2})?)\\s*-\\s*([^:]+):\\s*(.*)$",
      // Bracket: [8/6/20, 3:45:00 PM] Sender: text
      "^\\[(\\d{1,2}/\\d{1,2}/\\d{2,4}),\\s*(\\d{1,2}:\\d{2}(?::\\d{2})?[\\s\\u202f\\u00a0]*[APap][Mm])\\]\\s*([^:]+):\\s*(.*)$",
      "^\\[(\\d{1,2}/\\d{1,2}/\\d{2,4}),\\s*(\\d{1,2}:\\d{2}(?::\\d{2})?)\\]\\s*([^:]+):\\s*(.*)$",
    ].join("|")
  );

  function parseDateParts(dateS) {
    const m = String(dateS).trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
    if (!m) return null;
    let a = parseInt(m[1], 10);
    let b = parseInt(m[2], 10);
    let y = parseInt(m[3], 10);
    if (y < 100) y += 2000;
    let month;
    let day;
    if (a > 12) {
      day = a;
      month = b;
    } else if (b > 12) {
      month = a;
      day = b;
    } else {
      // Ambiguous: this chat's historical export is US M/D/YY
      month = a;
      day = b;
    }
    if (month < 1 || month > 12 || day < 1 || day > 31) return null;
    return { year: y, month, day };
  }

  function parseTimeParts(timeS) {
    const t = String(timeS)
      .replace(/\u202f/g, " ")
      .replace(/\u00a0/g, " ")
      .trim();
    const ampm = t.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*([APap][Mm])$/);
    if (ampm) {
      let h = parseInt(ampm[1], 10);
      const min = parseInt(ampm[2], 10);
      const sec = ampm[3] ? parseInt(ampm[3], 10) : 0;
      const mer = ampm[4].toUpperCase();
      if (mer === "AM") {
        if (h === 12) h = 0;
      } else if (h !== 12) h += 12;
      return { h, min, sec };
    }
    const h24 = t.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
    if (h24) {
      return {
        h: parseInt(h24[1], 10),
        min: parseInt(h24[2], 10),
        sec: h24[3] ? parseInt(h24[3], 10) : 0,
      };
    }
    return null;
  }

  function parseMsgDt(dateS, timeS) {
    const d = parseDateParts(dateS);
    const t = parseTimeParts(timeS);
    if (!d || !t) return null;
    const dt = new Date(d.year, d.month - 1, d.day, t.h, t.min, t.sec);
    if (Number.isNaN(dt.getTime())) return null;
    return dt;
  }

  function matchLine(line) {
    const s = line.replace(/^\uFEFF/, "");
    const m = s.match(MSG_LINE);
    if (!m) return null;
    // Four alternatives × 4 groups
    for (let i = 0; i < 4; i++) {
      const base = 1 + i * 4;
      if (m[base] && m[base + 1] && m[base + 2] != null) {
        return {
          dateS: m[base],
          timeS: m[base + 1],
          sender: m[base + 2].trim(),
          text: m[base + 3] || "",
        };
      }
    }
    return null;
  }

  function parseExportText(text) {
    const lines = String(text).replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
    const out = [];
    for (const line of lines) {
      const hit = matchLine(line);
      if (hit) {
        const dt = parseMsgDt(hit.dateS, hit.timeS);
        if (!dt) continue;
        out.push({
          dt,
          sender: hit.sender,
          text: hit.text,
          dateS: hit.dateS,
          timeS: hit.timeS.replace(/\u202f/g, " ").replace(/\u00a0/g, " ").trim(),
        });
      } else if (out.length && line.length) {
        out[out.length - 1].text += "\n" + line;
      }
    }
    out.sort((a, b) => a.dt - b.dt);
    return out;
  }

  function isSimon(sender) {
    const s = String(sender || "");
    return s.startsWith("\uD83E\uDD78") || s.startsWith("🥸") || /simon/i.test(s);
  }

  function isGaythan(sender) {
    return /gaythan/i.test(String(sender || ""));
  }

  function senderRole(sender) {
    if (isSimon(sender)) return "Simon";
    if (isGaythan(sender)) return "Gaythan";
    return "Other";
  }

  function dateKey(dt) {
    return `${dt.getMonth() + 1}/${dt.getDate()}/${String(dt.getFullYear()).slice(-2)}`;
  }

  async function inflateRaw(u8) {
    if (typeof DecompressionStream === "undefined") {
      throw new Error("This browser cannot unzip; export as .txt instead of .zip");
    }
    const stream = new Blob([u8]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
    return new Uint8Array(await new Response(stream).arrayBuffer());
  }

  async function unzipEntries(arrayBuffer) {
    const bytes = new Uint8Array(arrayBuffer);
    const view = new DataView(arrayBuffer);
    const files = [];
    let offset = 0;
    while (offset + 30 <= bytes.length) {
      const sig = view.getUint32(offset, true);
      if (sig === 0x02014b50 || sig === 0x06054b50) break;
      if (sig !== 0x04034b50) {
        offset += 1;
        continue;
      }
      const flags = view.getUint16(offset + 6, true);
      const method = view.getUint16(offset + 8, true);
      let compSize = view.getUint32(offset + 18, true);
      const nameLen = view.getUint16(offset + 26, true);
      const extraLen = view.getUint16(offset + 28, true);
      const nameBytes = bytes.subarray(offset + 30, offset + 30 + nameLen);
      const name = new TextDecoder("utf-8").decode(nameBytes);
      let dataStart = offset + 30 + nameLen + extraLen;
      if (flags & 0x8) {
        const marker = [0x50, 0x4b, 0x07, 0x08];
        let i = dataStart;
        let found = -1;
        while (i + 16 <= bytes.length) {
          if (
            bytes[i] === marker[0] &&
            bytes[i + 1] === marker[1] &&
            bytes[i + 2] === marker[2] &&
            bytes[i + 3] === marker[3]
          ) {
            found = i;
            break;
          }
          i += 1;
        }
        if (found < 0) throw new Error("Zip entry size missing; try exporting as .txt");
        compSize = found - dataStart;
        const compact = bytes.subarray(dataStart, found);
        let raw;
        if (method === 0) raw = compact;
        else if (method === 8) raw = await inflateRaw(compact);
        else throw new Error("Unsupported zip compression");
        files.push({ name, data: raw });
        offset = found + 16;
        continue;
      }
      const compact = bytes.subarray(dataStart, dataStart + compSize);
      let raw;
      if (method === 0) raw = compact;
      else if (method === 8) raw = await inflateRaw(compact);
      else throw new Error("Unsupported zip compression");
      files.push({ name, data: raw });
      offset = dataStart + compSize;
    }
    return files;
  }

  async function textFromFile(file) {
    const name = (file && file.name) || "chat.txt";
    const buf = await file.arrayBuffer();
    if (/\.zip$/i.test(name) || (buf.byteLength >= 4 && new Uint8Array(buf)[0] === 0x50 && new Uint8Array(buf)[1] === 0x4b)) {
      const entries = await unzipEntries(buf);
      const txts = entries.filter((e) => /\.txt$/i.test(e.name) && !e.name.startsWith("__MACOSX"));
      if (!txts.length) throw new Error("Zip has no .txt chat export inside");
      txts.sort((a, b) => {
        const score = (n) => {
          const x = n.toLowerCase();
          if (x.includes("_chat")) return 3;
          if (x.includes("whatsapp")) return 2;
          return 1;
        };
        return score(b.name) - score(a.name) || b.data.length - a.data.length;
      });
      return new TextDecoder("utf-8", { fatal: false }).decode(txts[0].data);
    }
    return new TextDecoder("utf-8", { fatal: false }).decode(buf);
  }

  async function sha256Hex(text) {
    const data = new TextEncoder().encode(text);
    const digest = await crypto.subtle.digest("SHA-256", data);
    return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
  }

  global.GolfParse = {
    parseExportText,
    parseMsgDt,
    parseDateParts,
    isSimon,
    isGaythan,
    senderRole,
    dateKey,
    textFromFile,
    sha256Hex,
    matchLine,
  };
})(window);
