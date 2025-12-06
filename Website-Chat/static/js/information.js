

document.getElementById("infoForm").addEventListener("submit", async (e) => {
    e.preventDefault();

    const data = {
        fullname: document.getElementById("fullname").value.trim(),
        birthday: document.getElementById("birthday").value,
        gender: document.getElementById("gender").value,
    };

    if (!data.fullname || !data.birthday) {
        alert(" Vui lòng nhập đầy đủ họ tên và ngày sinh!");
        return;
    }

    try {
        const res = await fetch("/save_info", {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify(data)
        });

        if (!res.ok) {
            alert(" Lỗi server!");
            return;
        }

        const result = await res.json();

        if (result.status === "success") {
            alert(" Lưu thông tin thành công!");
            window.location.href = "/home";
        }
        else if (result.status === "already_exists") {
            alert(" Bạn đã có thông tin trước đó!");
            window.location.href = "/home";
        }
        else {
            alert(" Có lỗi khi lưu thông tin!");
        }

    } catch (err) {
        console.error("Fetch error:", err);
        alert(" Kết nối server thất bại!");
    }
});