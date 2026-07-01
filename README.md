# WHO AM I? — เกมทายตัวตน (Multiplayer)

เกม "ฉันคือใคร" แบบห้องผู้เล่นหลายคนบนเว็บ — แต่ละคนมีคำตอบบนหัวที่ตัวเองไม่รู้ วนถาม yes/no แล้วทาย คะแนนตามลำดับ 3/2/1/0
สร้างด้วย Next.js + Upstash Redis + OpenAI (optional) ออกแบบให้ deploy บน **Vercel** ได้ทันที รองรับ ~20 คนพร้อมกัน (หลายห้อง ๆ ละ 3-6 คน)

## กติกา
- แต่ละรอบ ผู้เล่นวนกันถาม yes/no ทีละคนตามลำดับ
- ตาปัจจุบันเลือกได้ 2 อย่าง: **ถาม** หรือ **ทาย**
- **กติกาหลัก**: ใครเลือก "ทาย" → หมดสิทธิ์ถามในรอบนั้นทันที
- ทายถูก: คนแรก = 3 คะแนน, คนที่สอง = 2, คนที่สาม = 1, คนสุดท้าย = 0
- ทายผิด: หมดสิทธิ์ถาม+ทายรอบนั้น
- จบรอบเมื่อมี 3 คนทายถูก หรือทุกคนใช้สิทธิ์ทายหมดแล้ว → host เริ่มรอบใหม่ได้

## Tech Stack
- **Next.js 16 (App Router) + TypeScript + Tailwind** — frontend + API Route Handlers
- **Upstash Redis (REST)** — เก็บสถานะห้อง (serverless-friendly, TTL 2 ชม.)
- **OpenAI API** (optional) — สุ่มคำตอบตามหัวข้อ มี fallback list ถ้าไม่ใส่ key

## สถาปัตยกรรม
```
Browser ── HTTP polling 2.5s (เช็ค version) ──► Vercel (Next.js)
                                                    ├──► Upstash Redis (state)
                                                    └──► OpenAI (setup เท่านั้น)
```
- ทุก state อยู่ใน Redis key เดียวต่อห้อง → atomic, ไม่ conflict
- Conditional polling: ถ้า version ไม่เปลี่ยน คืน `304 Not Modified` → ประหยัด bandwidth
- Validation ทุก action ฝั่งเซิร์ฟเวอร์ (ไม่เชื่อใจ client)

---

## วิธีรัน (Local Dev)

### 1. ติดตั้ง dependencies
```bash
npm install
```

### 2. ตั้งค่า environment variables
สมัครบริการ 2 ตัว แล้วเอาค่ามาใส่:

**Upstash Redis** (https://console.upstash.com — free tier)
- สร้าง database → ได้ `UPSTASH_REDIS_REST_URL` และ `UPSTASH_REDIS_REST_TOKEN`

**OpenAI** (https://platform.openai.com/api-keys — optional)
- สร้าง API key → ได้ `OPENAI_API_KEY`
- ถ้าไม่ใส่ เกมจะใช้ word list สำรองแทน (ยังเล่นได้)

คัดลอกไฟล์ตัวอย่างแล้วแก้:
```bash
cp .env.local.example .env.local
# แก้ค่าใน .env.local
```

### 3. รัน dev server
```bash
npm run dev
```
เปิด http://localhost:3000 — ทดสอบเปิดหลายแท็บเพื่อจำลองหลายผู้เล่น

---

## Deploy บน Vercel

### 1. push ขึ้น GitHub
```bash
git init        # (ถ้ายังไม่มี)
git add .
git commit -m "WHO AM I game"
# สร้าง repo บน GitHub แล้ว:
git remote add origin <your-repo-url>
git push -u origin main
```

### 2. import เข้า Vercel
1. ไป https://vercel.com/new
2. เลือก repo ที่ push ไป
3. Framework จะตรวจพบเป็น Next.js อัตโนมัติ — ไม่ต้องเปลี่ยนอะไร

### 3. ใส่ Environment Variables
ในหน้า Settings → Environment Variables เพิ่ม 3 ตัว:

| Name | Value |
|------|-------|
| `UPSTASH_REDIS_REST_URL` | (จาก Upstash) |
| `UPSTASH_REDIS_REST_TOKEN` | (จาก Upstash) |
| `OPENAI_API_KEY` | (จาก OpenAI — optional) |

> 💡 ทิป: ใน Upstash console มีปุ่ม **"Copy Integration"** เชื่อมต่อกับ Vercel โดยตรง จะใส่ env ให้อัตโนมัติ

### 4. Deploy
กด **Deploy** — รอ ~1 นาที จะได้ลิงก์เว็บใช้งาน

---

## โครงสร้างโปรเจกต์
```
app/
  page.tsx                        หน้าหลัก: สร้างห้อง / เข้าร่วม
  room/[code]/page.tsx            หน้าเล่น (สลับตาม status)
  room/[code]/phases/             Lobby · Setup · Playing · Ended
  api/rooms/                      REST API (Route Handlers)
lib/
  types.ts                        Type definitions
  redis.ts                        Upstash client + TTL
  game.ts                         State machine + กติกา + validation
  openai.ts                       สุ่มคำตอบ + fallback
  api-client.ts                   Client fetch helpers
  useRoom.ts                      Polling hook
```

## API Endpoints
| Method | Path | หน้าที่ |
|--------|------|--------|
| POST | `/api/rooms` | สร้างห้อง |
| GET | `/api/rooms/[code]` | ดึง state (polling, รองรับ 304) |
| POST | `/api/rooms/[code]/join` | เข้าห้อง / reconnect |
| POST | `/api/rooms/[code]/start` | lobby→setup หรือ setup→playing |
| POST | `/api/rooms/[code]/setup` | ตั้งคำตอบ / สุ่ม AI |
| POST | `/api/rooms/[code]/action` | ถาม / ตอบ / ทาย |
| POST | `/api/rooms/[code]/next-round` | เริ่มรอบใหม่ |

## ความเสถียร
- ✅ State ใน key เดียว → atomic update ไม่ conflict
- ✅ TTL ลบห้องค้างอัตโนมัติ (2 ชม.)
- ✅ Conditional polling (304) ลดโหลด + กัน rate limit
- ✅ Reconnect: ใส่ชื่อเดิม → ผูก playerId เดิม
- ✅ OpenAI ล้มเหลว → fallback word list เกมไม่ดับ
