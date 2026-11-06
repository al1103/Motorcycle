# Motoform AI Motorcycle Studio

Danh mục chỉ hiển thị Yamaha MT-15 với thông số từ [Yamaha Motor Indonesia](https://www.yamaha-motor.co.id/product/mt15/). Không có xe, GLB, ảnh, giá phụ tùng hoặc hình học demo. Các gợi ý độ xe là ý tưởng chung, không xác nhận tương thích.

## Tạo ảnh concept AI thật

1. Chọn một trong năm góc nhìn.
2. Bấm **Tạo ảnh AI góc này** và xác nhận gửi prompt.
3. Nếu Puter yêu cầu, đăng nhập tài khoản Puter trong luồng đăng nhập.
4. Kết quả AI thay trạng thái trống của góc đó; có thể tải ảnh xuống. Ảnh chỉ giữ trong bộ nhớ trình duyệt của phiên hiện tại.

Ứng dụng tải Puter.js trì hoãn và gọi `puter.ai.txt2img` trên trình duyệt. Prompt được gửi tới Puter. Credit/phí phụ thuộc model và tài khoản; không gọi API khi chỉ tải trang. AI tạo concept dựa trên tên/thông tin xe, không phải ảnh do Yamaha chụp và không thể đảm bảo chính xác thiết kế OEM. Cần đăng nhập Puter nếu dịch vụ yêu cầu. Chưa có ảnh AI nào được seed sẵn trong ứng dụng; lần tạo cần tài khoản Puter đã đăng nhập. Tham khảo [Puter AI image API](https://docs.puter.com/AI/txt2img/).

## Chạy locally

```sh
python3 -m http.server 4173
```

Mở <http://localhost:4173>. Dữ liệu thông số nằm trong `data/catalog.json`. Thêm xe khi có nguồn nhà sản xuất đáng tin cậy; không thêm ảnh/GLB demo hay tuyên bố fitment chưa xác minh.
