
    async function handleLogin(event) {
      event.preventDefault();
      const user = document.getElementById('username').value.trim();
      const pass = document.getElementById('password').value.trim();
      const errorMsg = document.getElementById('errorMsg');
      if (user && pass) {
      const response = await fetch("/signin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: user, password: pass })
      });
      const result = await response.json();
      if (result.status === "go_home")
            {
                alert("Đăng nhập thành công!");
                setTimeout(   function()
                {
                    window.location.href = "/home";
                }, 1000);
            } else if (result.status === "go_info")
            {
            alert("Đăng nhập thành công!");
                setTimeout(   function()
                {
                    window.location.href = "/information";
                }, 1000);
            }
            else
                {
                    alert("Sai tên đăng nhập hoặc mật khẩu!");
                }
            document.getElementById('username').value = '';
            document.getElementById('password').value = '';
      }
      else
      {
      alert("Vui lòng nhập đầy đủ thông tin!");
       }
    }
