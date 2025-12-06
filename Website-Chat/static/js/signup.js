
    async function handleSignup(event)
    {
        event.preventDefault();
        const user = document.getElementById('username').value.trim();
        const pass = document.getElementById('password').value.trim();
        const messageBox = document.getElementById('message');
        if (user && pass)
        {
            const response = await fetch("/signup",
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username: user, password: pass })
            });
            const result = await response.json();
            if (result.status === "success")
            {
                alert("Đăng ký thành công!");
                messageBox.textContent = '🎉 Đăng ký thành công!'+' Chào mừng '+ user +'!';
                messageBox.style.color = "green";
                setTimeout(   function()
                {
                    window.location.href = "/signin";
                }, 1000);
            }   else
                {
                    alert("Tên người dùng đã tồn tại!");
                    messageBox.textContent = 'Tên người dùng đã tồn tại!';
                    messageBox.style.color = "red";
                }
            document.getElementById('username').value = '';
            document.getElementById('password').value = '';
        }
            else
            {
                alert("Vui lòng nhập đầy đủ thông tin!");
            }
        return false;
    }
