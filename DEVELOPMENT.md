# 🛠️ TANK.IO: Development Guide (คู่มือสำหรัยนักพัฒนา)

เอกสารฉบับนี้จัดทำขึ้นเพื่อให้คุณสามารถเริ่มต้นพัฒนาต่อยอดและปรับแต่ง Tank.io: Ultimate Edition ได้อย่างรวดเร็ว

## 📂 Project Structure (โครงสร้างโฟลเดอร์)

-   `/components`: ส่วนแสดงผล UI ของ React (Lobby, HUD, Settings, Chat)
-   `/engine`: หัวใจหลักของตัวเกม
    -   `/controllers`: จัดการการเคลื่อนที่ (Player Input & AI Logic)
    -   `/managers`: จัดการสถานะของเกม (XP, Level, Entities, Sound)
    -   `/systems`: ระบบประมวลผล (Physics, Collision, Render)
-   `/data`: ข้อมูลคงที่ (Tank Definitions, Evolutions, Maps, Skills)
-   `constants.ts`: ศูนย์รวมการตั้งค่าฟิสิกส์และความสมดุล (Game Rules)

---

## 🛠️ วิธีเพิ่ม "รถถังใหม่" (Creating a New Tank)

เพื่อให้ระบบเพิ่มรถถังได้ง่าย เราใช้ไฟล์ข้อมูลเดียวเพื่อกำหนดพฤติกรรมทั้งหมด:

1.  **ไปที่ไฟล์**: `data/tank-evolutions.ts`
2.  **เพิ่ม Archetype ใหม่**: กำหนดคลาส (Role), เลเวลที่ต้องใช้ (Tier), และรูปร่าง (BodyShape)
3.  **ตั้งค่ากระบอกปืน (Barrels)**:
    -   `angle`: มุมเอียง
    -   `recoil`: แรงถีบ
    -   `damageMult`: ตัวคูณดาเมจ
    -   `visualType`: เลือกจาก 'STANDARD', 'SNIPER', 'GATLING', 'LASER' ฯลฯ

---

## 🏗️ เทคโนโลยีที่ใช้ (Detailed Tech Stack)

เบื้องหลังความแรงของ Tank.io ประกอบไปด้วย:
-   **Frontend**: React 18 (UI Flow), Vite (Next-gen Bundler), Tailwind CSS (Design System)
-   **State**: Zustand (Store), Canvas API (High-freq Rendering)
-   **Backend**: Bun (Performance Runtime), WebSocket (Real-time Protocol)
-   **Data**: SQLite (Player Persistence), TypeScript 5 (Strict Typing)
-   **Utility**: Lucide React (Icons), Radix UI (Primitives), PeerJS (P2P Networking)

---

## 🧪 การทดสอบระบบ (Sandbox & Testing)

![Admin Menu](file:///C:/Users/Administrator/.gemini/antigravity/brain/7542542c-5e15-4278-af8e-1dc759602d22/admin_menu_checking_1775644503410.png)

สำหรับการทดสอบ คุณสามารถใช้ **Admin Menu** ได้ตลอดเวลา:
-   เข้าเกมในโหมด **Sandbox**
-   กดปุ่มมงกุฎที่มุมล่างซ้าย
-   คุณสามารถ: **เสกบอท (Spawn Bot)**, **อมตะ (God Mode)**, **เปลี่ยนเลเวล**, หรือ **เลือกคลาสใดก็ได้** เพื่อทดสอบความสมดุล

---

## 💡 แนวทางการเขียนโค้ด (Coding Standards)

-   **Type Safety**: ใช้ TypeScript เสมอ อย่าใช้ `any`
-   **High Frequency Performance**: อย่าใช้ `useState` หรือ `useEffect` ภายใน Loop ของ Engine (60fps) เนื่องจากจะทำให้เกมกระตุก ให้ใช้ `EntityManager` แทน
-   **Clean Code**: แยกแยกส่วนของ Logic (Systems) และส่วนของ State (Managers) ให้ชัดเจน
