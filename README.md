# 🛡️ TANK.IO: ULTIMATE EDITION (Production Ready)

![Lobby Screen](file:///C:/Users/Administrator/.gemini/antigravity/brain/7542542c-5e15-4278-af8e-1dc759602d22/lobby_screen_1775644061427.png)

เกมรถถัง IO แบบ Multiplayer ของจริงที่ถูกพัฒนาด้วยเทคโนโลยีล่าสุด เพื่อมอบประสบการณ์การเล่นที่ลื่นไหลระดับ 60 FPS พร้อมระบบกราฟิกแบบ Next-Gen และกลไกการเล่นที่ลึกซึ้ง

## ✨ ฟีเจอร์เด่น (Key Features)

*   **⚡ High-Performance Engine**: รันที่ 60 FPS คงที่ด้วยระบบ Fixed Tick Rate และ Entity Interpolation
*   **🌐 Real-time Multiplayer**: รองรับการเล่นหลายคนพร้อมกันผ่านระบบ Binary WebSocket และ PeerJS สำหรับการเชื่อมต่อที่รวดเร็ว
*   **📈 Evolution System**: อัปเกรดรถถังได้มากกว่า 24 รูปแบบ (Archetypes) เมื่อเลเวลถึงกำหนด
*   **🤖 Smart AI & Bosses**: บอทที่มีความฉลาด (Weighted Targeting) และบอสสุดโหดที่สุ่มเกิดเพื่อมอบ XP มหาศาล
*   **🛡️ Factions & Skills**: เลือกสังกัดฝ่าย (Faction) เพื่อรับบัฟพิเศษ และใช้สกิลกดใช้ (Active Skills) เพื่อพลิกสถานการณ์
*   **🎨 Advanced Visuals**: เอฟเฟกต์อนุภาค (Particles), ระบบแสงเงา, และแอนิเมชั่น Treads ที่สมจริง

![Gameplay FFA](file:///C:/Users/Administrator/.gemini/antigravity/brain/7542542c-5e15-4278-af8e-1dc759602d22/gameplay_screen_ffa_1775644096644.png)

## 🛠️ เทคโนโลยีและเครื่องมือที่ใช้ (Technical Stack & Tools)

โครงการนี้ถูกสร้างขึ้นด้วยเทคโนโลยีระดับแนวหน้าเพื่อให้ได้ประสิทธิภาพสูงสุด:

### 🎮 คอร์เอนจิน (Core Engine)
-   **TypeScript 5**: ภาษาหลักที่ใช้ในการพัฒนา เพื่อความแม่นยำและความปลอดภัยของโค้ด
-   **React 18**: ใช้สำหรับจัดการ UI และเมนูต่างๆ
-   **Zustand**: ไลบรารีสำหรับจัดการ State ที่เบาและรวดเร็ว (ใช้จัดการ XP, เลเวล, และการแจ้งเตือน)
-   **Tailwind CSS**: ใช้สำหรับตกแต่ง UI ให้สวยงามแบบทันสมัยและตอบสนองได้ทุกหน้าจอ

### 🖥️ ระบบหลังบ้าน (Backend & Infrastructure)
-   **Bun**: เครื่องมือรัน JavaScript/TypeScript ที่เร็วที่สุดในปัจจุบัน (เร็วกว่า Node.js หลายเท่า)
-   **Bun:SQLite**: ระบบฐานข้อมูลที่ฝังตัวอยู่ภายในตัวเอนจิน เพื่อการบันทึกข้อมูลผู้เล่นที่รวดเร็ว
-   **WebSocket (Binary)**: โปรโตคอลการสื่อสารที่ใช้ข้อมูลแบบไบนารีเพื่อลด Latency ให้ต่ำที่สุด

### 🔧 เครื่องมือพัฒนา (Developer Tools)
-   **Vite**: เครื่องมือ Build และ Development Server ที่รวดเร็วทันใจ
-   **PostCSS / Autoprefixer**: สำหรับจัดการ CSS ให้รองรับทุกเบราว์เซอร์
-   **Lucide React**: ชุดไอคอนแบบ Vector ที่สวยงามและคมชัด
-   **Radix UI**: คอมโพเนนต์พื้นฐานที่เน้นเรื่องการเข้าถึง (Accessibility)

## 🚀 วิธีเริ่มเกม (Getting Started)

### 1. ติดตั้ง Dependencies
```bash
npm install
```

### 2. รันตัวเกม (Development)
```bash
npm run start
```
*ระบบจะเปิด Server (Port 8080) และ Client (Port 5173) พร้อมกัน*

## 🎮 การควบคุม (Controls)

*   **W A S D**: เคลื่อนที่
*   **เลื่อนเมาส์**: เล็งเป้าหมาย
*   **คลิกซ้าย**: ยิง (Fire)
*   **Space / F**: ใช้สกิลพิเศษ (Active Skill)
*   **E**: เปิด/ปิด ยิงอัตโนมัติ (Auto Fire)
*   **C**: เปิด/ปิด หมุนอัตโนมัติ (Auto Spin)
*   **Esc**: เปิดเมนูทางออก (Exit Menu)
*   **1-8**: อัปเกรดค่า Stats (Regen, Speed, Damage, etc.)

![Evolution Menu](file:///C:/Users/Administrator/.gemini/antigravity/brain/7542542c-5e15-4278-af8e-1dc759602d22/evolution_menu_screen_1775644168201.png)

---

## 🏗️ โครงสร้างทางเทคนิค (Technical Architecture)

สำหรับนักพัฒนาที่สนใจรายละเอียดเชิงลึก สามารถอ่านต่อได้ที่:
*   [ARCHITECTURE.md](file:///c:/Users/Administrator/Desktop/Tank.io/ARCHITECTURE.md) - รายละเอียดระบบ Engine, Physics และ Network
*   [DEVELOPMENT.md](file:///c:/Users/Administrator/Desktop/Tank.io/DEVELOPMENT.md) - คู่มือการพัฒนาและการจัดการโค้ด

**Engine Powered by:** React, Vite, Bun, SQLite, Binary Protocol