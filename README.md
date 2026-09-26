# Color Cannons — TikTok LIVE Game

Game tương tác livestream TikTok: người xem comment tên quốc gia để kích hoạt kỹ năng trong game.

## Chạy

```bash
npm install
python3 -m pip install -r requirements.txt
npm start
```

- Game/OBS Browser Source: `http://localhost:8787`
- Bảng điều khiển và giả lập: `http://localhost:8787/control.html`
- Test sự kiện TikTok LIVE: `http://localhost:8787/live-test.html`

### Kết nối TikTok LIVE thật

```bash
TIKTOK_LIVE_USERNAME=ten_dang_live npm start
```

Hoặc mở `http://localhost:8787/live-test.html`, nhập username của tài khoản đang LIVE, không cần `@`, rồi nhấn **Kết nối**.

Game tự nghe event từ `/api/tiktok/stream`. Comment có chữ:

- `thailand`
- `vietnam`
- `japan`
- `china`

sẽ kích hoạt kỹ năng **Bão Đạn** cho phe tương ứng. Gift thật hiện đã hiển thị avatar/người tặng; mapping gift sang skill sẽ chốt sau.

Trong TikTok Live Studio hoặc OBS, thêm Browser Source độ phân giải dọc `1080×1920`, trỏ vào URL game.

## Luật chơi

- Comment `thailand`, `vietnam`, `japan`, `china`: gọi **Bão Đạn**.
- Pháo tự xoay và tự bắn.
- Đạn đổi màu ô theo màu phe.
- Pháo trúng đạn mất máu; pháo cuối cùng còn sống sẽ thắng.

## Thiết kế vòng chơi

1. Màn chờ giới thiệu tên game và một lời kêu gọi duy nhất: chọn `ĐỎ` hoặc `XANH`.
2. Mỗi trận dài 90 giây. Hai phe cùng 500 HP.
3. Người xem chọn phe một lần, sau đó dùng `ĐÁNH` hoặc `HỒI` liên tục.
4. Quà tạo siêu đòn 10–100 sát thương; follow hồi 15 HP; 20 tim tạo một đòn nhỏ.
5. Hết thời gian, phe còn nhiều HP hơn thắng. Top 5 chiến binh hiển thị xuyên suốt trận.

### Nguyên tắc UX

- Chỉ có ba hành động chính trên màn hình để người mới hiểu trong 3–5 giây.
- Màu đỏ/lửa và xanh/băng được giữ nhất quán ở nhân vật, HP, feed và bảng top.
- Đòn đánh có số sát thương, rung nhân vật, đổi feed và tăng combo để mỗi tương tác đều có phản hồi.
- Quà mạnh nhưng bị giới hạn, tránh một quà nhỏ phá hỏng toàn bộ trận.

## Deploy ghi nhớ

- Cần Node.js 18+.
- Cần Python 3 và package trong `requirements.txt`.
- Set `PORT` nếu hosting yêu cầu port riêng.
- Set `TIKTOK_LIVE_USERNAME` để server tự connect khi khởi động.
- Nếu host sleep/restart, TikTok stream sẽ mất kết nối và cần process chạy lại.

### Chạy trên máy ảo bằng Docker

```bash
docker build -t interac-game .
docker run -d --name interac-game --restart unless-stopped \
  -p 8787:8787 \
  -e TIKTOK_LIVE_USERNAME=ten_tiktok \
  interac-game
```

Game sẽ chạy tại `http://IP_MAY_AO:8787`. Nên đặt Nginx hoặc Caddy phía trước để có HTTPS khi dùng trên Internet.

### Cài nhanh trên Windows Cloud PC

Mở **PowerShell** trên Cloud PC rồi chạy một lệnh duy nhất:

```powershell
powershell -ExecutionPolicy Bypass -Command "irm https://raw.githubusercontent.com/NemCua/interac-game/main/scripts/install-cloud-pc-v3.ps1 | iex"
```

Script tự cài Git, Node.js và Python nếu máy còn thiếu; sau đó tải game, cài thư viện và tạo shortcut **Interac Game** ngoài Desktop. Từ lần sau chỉ cần mở shortcut: game tự cập nhật từ GitHub, tự chạy lại server nếu lỗi và mở cả game lẫn trang điều khiển.

Lần đầu mở, game tự nạp preset tối ưu đã xuất từ MacBook ngày `2026-09-26`. Preset chỉ được áp dụng một lần theo phiên bản nên những chỉnh sửa mới trên Cloud PC sẽ không bị ghi đè ở các lần mở sau.

Để chuyển đúng cấu hình từ máy cũ: mở `control.html` trên máy cũ, nhấn **Xuất cài đặt**, sau đó mở `control.html` trên Cloud PC và nhấn **Nhập cài đặt** để chọn file JSON vừa tải. Toàn bộ thông số hiệu năng, gameplay và vị trí avatar sẽ được giữ nguyên.

## Mô hình nội dung và doanh thu

Một phiên 60–90 phút gồm: 5 phút hướng dẫn, chuỗi trận 90 giây, 20–30 giây công bố top và tái đấu. Quà tặng tạo hiệu ứng mạnh nhưng không bảo đảm thắng; comment/follow vẫn có giá trị để tránh cảm giác “trả tiền là thắng”. Ghim lời kêu gọi: “Chọn ĐỎ/XANH — comment ĐÁNH — quà kích hoạt siêu đòn”.

Theo dõi mỗi buổi: người xem đồng thời, người tham gia/vòng, comment/phút, tỷ lệ xem sang vòng kế tiếp, người tặng quà và doanh thu/giờ. Chỉ tăng giá trị quà khi retention ổn định; không tạo tuyên bố thưởng tiền/may rủi nếu chưa kiểm tra chính sách và luật địa phương.
# Pháo Đài Sắc Màu

Game hiện dùng kiến trúc **engine + mode + map + mod**. Bản đấu bốn quốc gia là mode `country-battle`; gameplay cũ vẫn được giữ qua adapter tương thích.

- Core runtime: `public/game/core/`
- Game modes: `public/game/modes/`
- Map definitions: `public/game/maps/`
- Mod manifest: `public/mods/manifest.json`
- Hướng dẫn viết mod: `docs/MODDING.md`

Có thể kiểm tra runtime trong console bằng `ColorCannons.describe()` hoặc mở mode cụ thể với `?mode=country-battle`.

Mode quái vật đang có arena shell độc lập tại `/?mode=monster-raid`: chỉ giữ sân 3D và viền rừng, tắt toàn bộ gameplay/UI của mode quốc gia để sẵn sàng gắn hệ thống wave, quái và boss riêng.
