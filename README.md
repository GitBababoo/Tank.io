# 🛡️ TANK.IO: ULTIMATE EDITION (Production Ready)

เกมรถถัง IO แบบ Multiplayer ของจริง ใช้เทคโนโลยีล่าสุด (Bun + SQLite + Binary Websockets) เพื่อประสิทธิภาพสูงสุด

## 🚀 วิธีเริ่มเกม (เล่นคนเดียว หรือ เล่นกับเพื่อน)

### สิ่งที่ต้องมี
1. **Node.js** (สำหรับ Frontend)
2. **Bun** (สำหรับ Backend Server ที่แรงที่สุด)
   - ติดตั้ง Bun: `powershell -c "irm bun.sh/install.ps1 | iex"` (Windows) หรือ `curl -fsSL https://bun.sh/install | bash` (Mac/Linux)

### 1. ติดตั้ง Dependencies
```bash
npm install
```

### 2. รันเกม (Server + Client พร้อมกัน)
```bash
npm run start
```
*ระบบจะเปิด Server (Port 8080) และ Client (Port 5173) ให้เองครับ*

---

## 🌐 วิธีเล่นกับเพื่อน (Multiplayer)

### กรณีอยู่บ้านเดียวกัน (LAN / WiFi เดียวกัน)
1. เครื่องคุณ (Host) รันคำสั่ง `npm run start`
2. ดู **IP Address** เครื่องคุณ (เปิด CMD พิมพ์ `ipconfig` หา IPv4 เช่น `192.168.1.45`)
3. บอกเพื่อนให้เปิด Browser ในมือถือหรือคอม แล้วเข้า:
   `http://192.168.1.45:5173`
4. **สำคัญ:** คุณต้องปิด Firewall หรืออนุญาตพอร์ต `8080` และ `5173` ด้วยครับ

### กรณีอยู่คนละที่ (Over Internet)
1. ใช้เครื่องมือเช่น **ngrok** หรือ **Cloudflare Tunnel**
2. Forward Port 5173 (Client) และ 8080 (WebSocket)
3. หรือ Deploy ขึ้น VPS (เช่น DigitalOcean) โดยใช้ Docker

---

## 🎮 การควบคุม (Controls)
* **W A S D**: เคลื่อนที่
* **เมาส์**: เล็งและยิง
* **Space**: สกิลกดใช้ (Active Skill)
* **F**: สกิลกดใช้ (สำรอง)
* **E**: เปิด/ปิด ยิงอัตโนมัติ (Auto Fire)
* **C**: เปิด/ปิด หมุนตัวอัตโนมัติ (Auto Spin)
* **O**: ฆ่าตัวตาย (Suicide)
* **1-8**: อัปเกรดค่าสถานะ
* **Enter**: แชท / เกิดใหม่

## 🛠️ Admin / Sandbox Commands
กดปุ่ม **Admin Icon** (มงกุฎสีเหลือง) มุมจอเพื่อเปิดเมนูเสกของ, เปลี่ยนเลเวล, หรือเปลี่ยนคลาสได้ทันที

---

**Engine Powered by:** React, Vite, Bun, SQLite, Binary Protocol