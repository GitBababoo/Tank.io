# 🏛️ TANK.IO: System Architecture (สถาปัตยกรรมระบบ)

เอกสารฉบับนี้อธิบายรายละเอียดเชิงลึกเกี่ยวกับการทำงานของ Engine และระบบเครือข่ายของ Tank.io: Ultimate Edition

## 🎮 Game Engine Core (หัวใจของเอนจิน)

เอนจินถูกออกแบบมาให้ทำงานแบบ **Fixed Tick Rate** ที่ 60 สเต็ปต่อวินาที (60 TPS) เพื่อความแม่นยำของฟิสิกส์และการคำนวณ โดยแบ่งการทำงานเป็นส่วนๆ ดังนี้:

### 1. Loop Management
- **GameLoop**: ใช้ `requestAnimationFrame` ร่วมกับการคำนวณ Delta Time เพื่อให้การเคลื่อนที่สม่ำเสมอไม่ว่าจอจะมี Refresh Rate เท่าใด
- **Fixed Update**: ระบบจะคำนวณฟิสิกส์แยกขาดจากเฟรมเรตการเรนเดอร์ เพื่อป้องกันบั๊ก "ตัวทะลุ" หรือ "วาร์ป" ในขณะที่เฟรมเรตตก

### 2. Entity Management & Interpolation
- ระบบใช้การทำ **Interpolation** (การแทรกเฟรม) เพื่อให้มวลวัตถุและรถถังศัตรูเคลื่อนที่ได้อย่างนุ่มนวล แม้ในขณะที่การเชื่อมต่ออินเทอร์เน็ตไม่เสถียร

---

## 🛰️ Networking & Multiplayer (ระบบเครือข่าย)

เพื่อให้ได้ค่า Ping ที่ต่ำที่สุด Tank.io ใช้ระบบผสมผสาน:

### 1. Binary WebSocket Protocol (Bun)
- **Compact Serialization**: ข้อมูลถูกส่งในรูปแบบ Binary (ArrayBuffer) แทน JSON ทำให้ประหยัดขนาดข้อมูลลงได้มหาศาล และลดภาระการ Parse ของ CPU
- **Low Latency**: ใช้ความสามารถของ Bun WebSocket ที่รันบน `uWebSockets` ซึ่งมีประสิทธิภาพสูงที่สุดในกลุ่มเครื่องมือรัน JavaScript
- **State Interpolation**: ฝั่ง Client จะทำการทำนายตำแหน่งล่วงหน้า (Client-side Prediction) เพื่อให้การขยับดูไม่สะดุดแม้ค่า Ping จะพุ่งสูง

### 2. SQLite Database (Persistence)
- **High-Speed I/O**: ใช้ `bun:sqlite` เพื่อเข้าถึงฐานข้อมูลโดยตรงด้วยความเร็วระดับ Native
- **Data Integrity**: เก็บข้อมูล XP, เลเวล, และสถิติการเล่นไว้อย่างปลอดภัยและค้นหาได้ทันทีเมื่อผู้เล่นกลับมาเข้าเกมใหม่

---

## ⚙️ Physics & Collision (ระบบฟิสิกส์)

![Gameplay Density](file:///C:/Users/Administrator/.gemini/antigravity/brain/7542542c-5e15-4278-af8e-1dc759602d22/gameplay_screen_ffa_1775644096644.png)

### 1. Spatial Grid Partitioning
- แผนที่ขนาด 5000x5000 จะถูกแบ่งเป็นตาราง (Grid) ย่อยๆ
- ระบบจะตรวจสอบการชนกัน **เฉพาะวัตถุที่อยู่ในตารางเดียวกัน** เท่านั้น ทำให้สามารถรองรับวัตถุในฉากได้นับพันชิ้นโดยไม่ทำให้เครื่องแลค ($O(N \log N)$ optimization)

### 2. CCD (Continuous Collision Detection)
- สำหรับกระสุนความเร็วสูง เราใช้วิธี **Raycasting** เพื่อลากเส้นตรวจจับการชนล่วงหน้า ป้องกันปัญหากระสุนทะลุผนังหรือรถถัง

---

## 🤖 AI Logic (ปัญญาประดิษฐ์)

บอทในเกมนี้ไม่ได้เดินมั่วซั่ว แต่ใช้ระบบ **Weighted Decision Scoring**:
- บอทจะให้คะแนนวัตถุรอบตัว (ผู้เล่นอื่น, อาหาร, บอส)
- ปัจจัยที่ส่งผลต่อคะแนน: ระยะห่าง, เลือดที่เหลืออยู่, และความอันตราย
- **Anti-Mobbing**: ระบบจะจำกัดจำนวนบอทที่จะรุมผู้เล่นคนเดียวไม่ให้เกิน 3 ตัว เพื่อความเป็นธรรม

![Exit Menu Menu](file:///C:/Users/Administrator/.gemini/antigravity/brain/7542542c-5e15-4278-af8e-1dc759602d22/exit_menu_screen_1775644266633.png)
