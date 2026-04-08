# 🛡️ TANK.IO: ULTIMATE EDITION (Master Technical Document)

![Lobby Hero](./assets/screenshots/lobby.png)

นี่คือโปรเจกต์รถถัง Multiplayer ระดับ High-End ที่รวมเทคโนโลยีเว็บที่ทันสมัยที่สุดในปัจจุบัน เพื่อสร้างประสบการณ์การเล่นที่ลื่นไหล เสถียร และมีโครงสร้างโค้ดที่ขยายต่อได้ง่าย

---

## 🛠️ เจาะลึกเทคโนโลยี (The Technical Stack)

โปรเจกต์นี้ไม่ได้ใช้แค่เครื่องมือทั่วไป แต่เลือกใช้ "ส่วนผสม" ที่ดีที่สุดสำหรับเกม Real-time:

### 🎨 Frontend (The Interactive Layer)
-   **React 18**: ใช้จัดการ UI, Menu และ Overlay ทั้งหมด (ไม่ได้ใช้ Canvas วาดปุ่ม เพื่อให้แก้ไขง่ายและ Responsive)
-   **TypeScript 5**: หัวใจหลักที่ทำให้โค้ดนับหมื่นบรรทัดไม่บั๊ก เพราะมีระบบ Type Checking ที่คอยคุมทุกตัวแปร
-   **Zustand**: ใช้จัดการ Global State (เช่น XP, Level, Stats) แทน Redux เพราะเบากว่าและเร็วกว่ามาก เหมาะกับเกม
-   **Tailwind CSS**: ใช้แต่ง UI ให้ดูพรีเมียม (Glassmorphism, Neon Glow) โดยไม่ต้องเขียน CSS แยกไฟล์ให้วุ่นวาย
-   **Lucide React**: ชุดไอคอน Vector ที่คมชัดระดับ 4K

### ⚙️ Game Engine (The Brain)
-   **Canvas 2D API**: ใช้ในการวาดภาพรถถังและกระสุนนับพันชิ้นพร้อมกันที่ 60 FPS
-   **Fixed Tick Rate (60Hz)**: ระบบที่ทำให้เกมรันด้วยความเร็วเท่ากันทุกเครื่อง ไม่ว่าคอมจะช้าหรือเร็ว
-   **Entity Interpolation**: ระบบทำนายการเคลื่อนที่ล่วงหน้า ทำให้รถถังตัวอื่นดูไม่วาร์ปไปมา
-   **Circular & AABB Collision**: ระบบคำนวณการชนที่แม่นยำสูง (กระสุนชนผนัง, รถถังชนกัน)

### 🖥️ Backend (The Real-time Core)
-   **Bun Runtime**: เร็วกว่า Node.js 3-4 เท่า ทำให้ Server รองรับคนเล่นได้มากขึ้นในทรัพยากรที่น้อยลง
-   **TSX**: เครื่องมือที่ช่วยให้เราเขียนไฟล์ Server ด้วย `.ts` ได้โดยตรง ไม่ต้องเสียเวลา Build
-   **SQLite (Bun Native)**: ระบบฐานข้อมูลที่เร็วที่สุดในโลกสำหรับโปรเจกต์ขนาดกลาง ใช้เก็บ Score และเลเวลผู้เล่นแบบถาวร
-   **Binary WebSockets**: เราไม่ได้ส่งข้อมูลเป็นตัวหนังสือ (JSON) แต่ส่งเป็น "เลขไบนารี" (0-1) เพื่อลดขนาดข้อมูลลง 80% ทำให้ไม่แล็ก

---

## 📈 รายละเอียดระบบภายใน (Internal Systems)

| ระบบ (System) | หน้าที่ (Functionality) |
| :--- | :--- |
| **NetworkManager** | จัดการการเชื่อมต่อ WebSocket และการบีบอัดข้อมูล Binary |
| **WorldSystem** | ควบคุมปริมาณการเกิดของบอท (AI), สิ่งกีดขวาง และบอส |
| **PhysicsSystem** | คำนวณความเร็ว, แรงเฉื่อย (Friction), และการสะท้อนของกระสุน |
| **WeaponSystem** | จัดการทุกอย่างเกี่ยวกับกระสุน (Bullet Speed, Damage, Lifetime) |
| **AISystem** | บอทที่มีความฉลาด (Weighted Pathfinding) ไม่เดินโง่ๆ ชนกำแพง |
| **StatManager** | ระบบการอัปเกรด 8 ด้าน (Regen, Health, Body Damage, etc.) |

---

## 📡 โครงสร้างการส่งข้อมูล (Binary Protocol)

เพื่อให้เกมลื่นที่สุด เราส่งข้อมูลในรูปแบบ `Uint8Array`:
-   `Type (1 byte)`: ประเภทข้อมูล (เคลื่อนที่, ยิง, ตาย)
-   `Sequence (2 bytes)`: ลำดับแพ็กเก็ต (เพื่อป้องกันข้อมูลมาผิดลำดับ)
-   `Data (Variable)`: พิกัด X, Y และทิศทาง (บีบอัดลงเหลือ 2-4 bytes ต่อตัว)

---

![Gameplay Action](./assets/screenshots/gameplay.png)

## 🏗️ โครงสร้างโฟลเดอร์ (Project Anatomy)
-   `/components`: ส่วนของ UI (Lobby, HUD, Upgrade Menu)
-   `/engine`: หัวใจของเกม (Systems, Managers, Controllers)
-   `/data`: ข้อมูล Stat ของรถถังทุก Class (มากกว่า 100+ แบบ)
-   `/server`: โค้ด Backend และฐานข้อมูล SQLite

![Class Tree](./assets/screenshots/classes.png)

## 🎯 วิธีการ "Present" หรือแคปผลงาน
1.  **GitHub Stats**: โปรเจกต์นี้เขียนด้วย TypeScript 100% ซึ่งดูเป็นมืออาชีพมากใน GitHub
2.  **Binary Demo**: สามารถโชว์ได้ว่า Network Traffic ของเกมนี้ต่ำมาก (ใช้ Inspector ดูได้)
3.  **Architecture Doc**: ไฟล์ `ARCHITECTURE.md` ในโปรเจกต์ถูกเขียนมาเพื่อให้นักพัฒนาระดับ Senior อ่านแล้วเข้าใจทันที

---

**Engine Powered by:** React, Vite, Bun, SQLite, Binary Protocol