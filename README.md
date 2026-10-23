# PhoneCam · เว็บส่งภาพจากมือถือเข้า PC

เวอร์ชันแข่งขันใช้ GitHub Pages โฮสต์หน้าเว็บ HTTPS, LiveKit Cloud ส่งวิดีโอผ่าน WebRTC และ token API แยกเพื่อเก็บ LiveKit secret ไว้ฝั่งเซิร์ฟเวอร์

## โครงสร้าง

- `site/` เว็บ receiver และ mobile publisher สำหรับ GitHub Pages
- `token-api/` Node.js API ออก LiveKit token อายุ 15 นาที จำกัด role และมี rate limit เบื้องต้น
- `.github/workflows/pages.yml` deploy `site/` ไป GitHub Pages อัตโนมัติเมื่อ push เข้า `main`
- `render.yaml` ตัวอย่าง deploy token API บน Render

## ขั้นตอน deploy

1. สร้าง LiveKit Cloud project และเก็บ Project URL, API Key, API Secret ไว้
2. สร้าง GitHub repository แล้วอัปโหลด **เนื้อหาภายในโฟลเดอร์ `outputs`** เป็น root ของ repository จากนั้น push ขึ้น branch `main`
3. ใน GitHub ไปที่ **Settings → Pages → Build and deployment → Source: GitHub Actions**
4. สร้าง Web Service จาก repository บน Render โดยใช้ `render.yaml` แล้วตั้ง environment variables:
   - `LIVEKIT_API_KEY` และ `LIVEKIT_API_SECRET` จาก LiveKit (ห้ามใส่ใน GitHub Pages)
   - `ALLOWED_ORIGIN` เป็น origin ของ GitHub Pages เช่น `https://username.github.io`
5. รอ GitHub Actions deploy หน้าเว็บ แล้วเปิด URL GitHub Pages
6. ในหน้า PhoneCam กด **ตั้งค่า LiveKit และ Token API** ใส่ LiveKit URL (`wss://...`) และ URL ของ Render แล้วบันทึก
7. สแกน QR ด้วยมือถือ กดเริ่มถ่ายทอด แล้วกดเชื่อมต่อห้องบนคอม

GitHub Pages เป็น static hosting จึงไม่รัน `server.js`; backend token API และ LiveKit เป็นบริการแยกที่จำเป็นสำหรับสตรีมจริง

## เดโมบน OBS

เพิ่มหน้า receiver เป็น Browser Source ใน OBS แล้วเชื่อมต่อห้อง จากนั้นกด **Start Virtual Camera** และเลือก OBS Virtual Camera ในโปรแกรมประชุม

## ความเป็นส่วนตัวและข้อจำกัด

- กล้องเปิดหลังผู้ใช้กดอนุญาตบนมือถือเท่านั้น
- API secret อยู่บน backend; URL/key ฝั่ง client ไม่ใช่ secret
- Token อายุ 15 นาที และแยกสิทธิ์ publisher/viewer; API จำกัดการขอ token เบื้องต้น
- วิดีโอเดินทางผ่าน LiveKit Cloud; ตรวจเงื่อนไขบริการและนโยบายข้อมูลก่อนใช้งาน
- ต้องมีอินเทอร์เน็ตทั้งมือถือและคอม การเชื่อมต่อ WebRTC อาจถูกจำกัดโดยบางเครือข่าย/firewall

## ทดสอบ UI ในเครื่อง

เปิด `site/index.html` ผ่าน local static server; อย่าเปิด HTML ด้วย `file://` เพราะการใช้กล้องต้อง secure context และ ESM import อาจถูกบล็อก

