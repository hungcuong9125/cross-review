# Review Weave

Review Weave là công cụ Desktop chuyên dụng để tổng hợp, ghép nối và phân phối báo cáo review chéo (cross-review) giữa các mô hình QA hoặc đội ngũ QA.

## Chức năng chính

Từ $N$ nguồn báo cáo QA, Review Weave tự động phân tách và ghép nối để tạo ra $N$ tệp Markdown xuất ra. Mỗi tệp được tùy biến cho một đội nhận cụ thể và chứa nội dung báo cáo của tất cả các đội *khác* (loại trừ chính đội nhận). Điều này giúp tối ưu hóa quy trình đánh giá và review chéo giữa các bên một cách khách quan.

**Ví dụ với 5 đội QA:**
- `review-for-qa-1.md` → Chứa báo cáo của các đội 2, 3, 4, 5.
- `review-for-qa-2.md` → Chứa báo cáo của các đội 1, 3, 4, 5.
- `review-for-qa-3.md` → Chứa báo cáo của các đội 1, 2, 4, 5.
- ...và tương tự.

## Tính năng nổi bật trong phiên bản mới

1. **Phân nhóm Sidebar trái trực quan**: Danh sách được phân chia rõ ràng thành 3 nhóm: *Nguồn thông tin*, *Mở đầu* và *Kết thúc* kèm theo phím chức năng Nhân bản (Duplicate) và Xóa (Delete) nhanh chóng khi hover chuột.
2. **Nút Toggle Switch mini**: Hỗ trợ bật/tắt (Active/Inactive) hoạt động của từng nguồn hoặc thành phần riêng biệt. Các nguồn bị tắt sẽ tự động được loại bỏ khỏi tệp Markdown xuất ra và bỏ qua các bước kiểm tra lỗi chặn xuất (Validation).
3. **Kéo giãn kích thước (Resizable) Sidebar phải**: Cho phép người dùng linh hoạt kéo giãn mép trái của Sidebar phải để thay đổi độ rộng hiển thị Preview tùy ý (khống chế min 400px và max 50% màn hình làm việc còn lại).
4. **Đồng bộ hóa lựa chọn 2 chiều**: Click chọn nguồn trên Sidebar trái sẽ tự động cập nhật Preview target tương ứng trên Sidebar phải, và ngược lại khi thay đổi dropdown xem trước.
5. **Cải tiến định dạng Markdown & Xử lý văn bản**:
   - **Review chéo**: Tùy chọn ẩn nguồn nhận khỏi nội dung preview (mặc định là bật).
   - **Chuẩn hóa khoảng trắng**: Rút gọn các dòng trống liên tiếp.
   - **Xuất thành một dòng**: Gộp toàn bộ văn bản thành một dòng duy nhất (tự động loại bỏ các định dạng markdown tiêu đề `#` và dòng kẻ `---` ở đầu dòng để tránh lỗi in đậm toàn bộ) giúp LLM dễ dàng phân tích.
6. **Khởi động dự án trống**: Ứng dụng khởi động với trạng thái trống sạch sẽ, không chứa dữ liệu demo để người dùng bắt đầu ngay dự án mới.

## Công nghệ sử dụng

- **Backend**: Rust (Tauri 2 command handlers, validation, export logic, file I/O)
- **Frontend**: React + TypeScript + Vite
- **State Management**: Zustand
- **Desktop Wrapper**: Tauri 2
- **Styling**: Tailwind CSS / Vanilla CSS

## Yêu cầu hệ thống

- [Rust](https://rustup.rs/) (1.70+)
- [Node.js](https://nodejs.org/) (18+)
- [npm](https://www.npmjs.com/) (hoặc pnpm/yarn)

## Hướng dẫn phát triển

```bash
# Cài đặt thư viện dependencies
npm install

# Khởi động ứng dụng trong chế độ Development
npm run tauri dev
```

## Build đóng gói sản phẩm

```bash
# Build đóng gói cho nền tảng hiện tại
npm run tauri build

# Build cho các nền tảng cụ thể (Cross-compilation)
npm run tauri build --target x86_64-unknown-linux-gnu   # Linux
npm run tauri build --target x86_64-apple-darwin          # macOS Intel
npm run tauri build --target aarch64-apple-darwin          # macOS Apple Silicon (M1/M2/M3)
npm run tauri build --target x86_64-pc-windows-msvc        # Windows
```

Sản phẩm đóng gói hoàn chỉnh nằm trong thư mục `src-tauri/target/release/bundle/`.

## Cấu trúc thư mục dự án

```
src-tauri/
  src/
    main.rs          # Điểm chạy Tauri app
    lib.rs           # Khai báo các module
    models.rs        # Định nghĩa các structs dữ liệu (Project, QaReport, Component...)
    validation.rs    # Logic kiểm tra lỗi dữ liệu (Validation)
    export.rs        # Logic ghép nối và xuất tệp Markdown
    slug.rs          # Tự động sinh tên tệp không trùng lặp
    zip_export.rs    # Nén tệp xuất thành định dạng ZIP
    commands.rs      # Đăng ký hàm giao tiếp Tauri Command (IPC)

src/
  App.tsx                # Giao diện chính, quản lý kéo giãn Sidebar phải
  main.tsx               # Khởi chạy React
  index.css              # Stylesheet toàn cục và markdown preview
  state/
    projectStore.ts      # Zustand quản lý dữ liệu và cấu hình cài đặt
  lib/
    api.ts               # Các hàm invoke gọi xuống Rust backend
    i18n.ts              # Hỗ trợ đa ngôn ngữ Anh - Việt
  components/
    Sidebar.tsx          # Danh sách nguồn thông tin và phím chức năng
    EditorPanel.tsx      # Trình chỉnh sửa nội dung nguồn, mở đầu, kết thúc
    PreviewPanel.tsx     # Khung xem trước Markdown/HTML, thông số thống kê, cấu hình
    Toolbar.tsx          # Thanh công cụ chứa các nút lưu, mở, xuất dự án
```

## Phím tắt bàn phím

| Phím tắt | Chức năng |
|----------|-----------|
| `Ctrl/Cmd + N` | Tạo dự án mới |
| `Ctrl/Cmd + S` | Lưu file dự án |
| `Ctrl/Cmd + O` | Mở file dự án |
| `Ctrl/Cmd + E` | Xuất tất cả tệp Markdown |

## Định dạng tệp Markdown xuất ra

Mỗi tệp Markdown được xuất ra có định dạng chuẩn:

```markdown
{Nội dung các thành phần Mở đầu đang bật}

## 1. {Tên nguồn 1}

{Nội dung nguồn 1}

---

## 2. {Tên nguồn 2}

{Nội dung nguồn 2}

---

{Nội dung các thành phần Kết thúc đang bật}
```

## Bản quyền

Dự án được phân phối dưới giấy phép MIT License.
