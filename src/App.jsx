import { useEffect, useState } from "react";
import "./App.css";

const API = "https://tradenex-api.onrender.com";

const money = (n) =>
  `$${Number(n || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

async function api(path, options = {}) {
  const res = await fetch(API + path, {
    ...options,
    headers: {
      ...(options.body instanceof FormData
        ? {}
        : { "Content-Type": "application/json" }),
      ...(options.headers || {}),
    },
  });

  const json = await res.json().catch(() => ({
    success: false,
    message: "Invalid server response.",
  }));

  if (!res.ok) {
    throw new Error(
      json.message || "Something went wrong"
    );
  }

  return json;
}

function App() {
  const [logged, setLogged] = useState(
    localStorage.getItem("tradenex_admin") === "1"
  );

  const [page, setPage] = useState("dashboard");
  const [sidebar, setSidebar] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const [users, setUsers] = useState([]);
  const [deposits, setDeposits] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [support, setSupport] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [notificationUnread, setNotificationUnread] = useState(0);
  const [notificationOpen, setNotificationOpen] = useState(false);

  const [supportOpenTicketId, setSupportOpenTicketId] =
    useState(null);

  const [selectedUser, setSelectedUser] = useState(null);
  const [userModal, setUserModal] = useState("");
  const [statementUser, setStatementUser] = useState(null);
  const [userForm, setUserForm] = useState({
    name: "",
    email: "",
    mobile: "",
    aadhaar: "",
    address: "",
    balance: "",
    password: "",
  });

  const [login, setLogin] = useState({
    email: "",
    password: "",
  });

  async function loadNotifications() {
    try {
      const result = await api("/api/admin/notifications");

      if (result && result.success) {
        setNotifications(
          Array.isArray(result.notifications)
            ? result.notifications
            : []
        );

        setNotificationUnread(
          Number(result.unreadCount || 0)
        );
      }
    } catch (error) {
      console.error("NOTIFICATIONS LOAD ERROR:", error);
    }
  }

  async function markNotificationRead(id) {
    try {
      const result = await api(
        `/api/admin/notifications/${id}/read`,
        { method: "PUT" }
      );

      if (result && result.success) {
        setNotifications((items) =>
          items.map((item) =>
            String(item.id) === String(id)
              ? { ...item, read: true }
              : item
          )
        );

        setNotificationUnread((count) =>
          Math.max(0, count - 1)
        );
      }
    } catch (error) {
      console.error("NOTIFICATION READ ERROR:", error);
    }
  }

  async function openAdminNotification(
    notification
  ) {
    if (!notification) return;

    if (!notification.read) {
      await markNotificationRead(
        notification.id
      );
    }

    setNotificationOpen(false);

    if (
      notification.type === "support" ||
      notification.meta?.ticketId
    ) {
      setSupportOpenTicketId(
        notification.meta?.ticketId || null
      );

      setPage("support");
      setSidebar(false);

      /*
       * Refresh support data so a newly-created
       * ticket is available before opening chat.
       */
      try {
        const result = await api(
          "/api/admin/support"
        );

        setSupport(
          Array.isArray(result.support)
            ? result.support
            : []
        );
      } catch (error) {
        console.error(
          "SUPPORT REFRESH ERROR:",
          error
        );
      }
    }
  }

  async function markAllNotificationsRead() {
    try {
      const result = await api(
        "/api/admin/notifications/read-all",
        { method: "PUT" }
      );

      if (result && result.success) {
        setNotifications((items) =>
          items.map((item) => ({
            ...item,
            read: true,
          }))
        );

        setNotificationUnread(0);
      }
    } catch (error) {
      console.error(
        "NOTIFICATIONS READ ALL ERROR:",
        error
      );
    }
  }

  async function loadAdminData() {
    try {
      setLoading(true);

      const [
        usersRes,
        depositsRes,
        withdrawalsRes,
        transactionsRes,
        supportRes,
      ] = await Promise.all([
        api("/api/admin/users"),
        api("/api/admin/deposits"),
        api("/api/admin/withdrawals"),
        api("/api/admin/transactions"),
        api("/api/admin/support"),
      ]);

      setUsers(usersRes.users || []);
      setDeposits(depositsRes.deposits || []);
      setWithdrawals(withdrawalsRes.withdrawals || []);
      setTransactions(
        transactionsRes.transactions || []
      );
      setSupport(supportRes.support || []);
    } catch (e) {
      setMessage(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!logged) return;

    let cancelled = false;
    let initialized = false;
    let knownIds = new Set();

    async function pollAdminNotifications() {
      if (cancelled) return;

      try {
        const result = await api(
          "/api/admin/notifications"
        );

        if (cancelled || !result?.success) {
          return;
        }

        const list = Array.isArray(
          result.notifications
        )
          ? result.notifications
          : [];

        setNotifications(list);

        setNotificationUnread(
          Number(result.unreadCount || 0)
        );

        const currentIds = new Set(
          list.map((item) =>
            String(item.id)
          )
        );

        if (initialized) {
          const hasNew =
            list.some(
              (item) =>
                !knownIds.has(
                  String(item.id)
                )
            );

          if (hasNew) {
            playTradenexAdminNotificationSound();

            try {
              if (
                "vibrate" in navigator
              ) {
                navigator.vibrate([
                  180,
                  80,
                  180,
                ]);
              }
            } catch {}
          }
        }

        knownIds = currentIds;
        initialized = true;
      } catch (error) {
        console.error(
          "NOTIFICATIONS LOAD ERROR:",
          error
        );
      }
    }

    loadAdminData();
    pollAdminNotifications();

    const notificationTimer =
      setInterval(
        pollAdminNotifications,
        10000
      );

    const unlockAudio = () => {
      try {
        const AudioCtx =
          window.AudioContext ||
          window.webkitAudioContext;

        if (!AudioCtx) return;

        const ctx = new AudioCtx();

        if (
          ctx.state ===
          "suspended"
        ) {
          ctx.resume().catch(() => {});
        }

        setTimeout(() => {
          try {
            ctx.close();
          } catch {}
        }, 500);
      } catch {}
    };

    window.addEventListener(
      "pointerdown",
      unlockAudio,
      { once: true }
    );

    return () => {
      cancelled = true;
      clearInterval(
        notificationTimer
      );

      window.removeEventListener(
        "pointerdown",
        unlockAudio
      );
    };
  }, [logged]);


  function openUserEdit(user) {
    setSelectedUser(user);
    setUserForm({
      name: user.name || "",
      email: user.email || "",
      mobile: user.mobile || user.phone || "",
      aadhaar: user.aadhaar || "",
      address: user.address || "",
      balance: user.balance ?? 0,
      password: "",
    });
    setUserModal("edit");
  }

  function openUserStatement(user) {
    setStatementUser(user);
    setUserModal("statement");
  }

  function closeUserStatement() {
    setStatementUser(null);
    setUserModal("");
  }

  function printUserStatement() {
    if (!statementUser) return;

    const uid = statementUser.id;

    const userDeposits = deposits
      .filter((d) => d.userId === uid)
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    const userWithdrawals = withdrawals
      .filter((w) => w.userId === uid)
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    const userTransactions = transactions
      .filter((t) => t.userId === uid)
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    const name =
      statementUser.name ||
      `${statementUser.firstName || ""} ${statementUser.lastName || ""}`.trim() ||
      "User";

    const moneyValue = (value) =>
      `$${Number(value || 0).toFixed(2)}`;

    const dateValue = (value) =>
      value ? new Date(value).toLocaleString() : "-";

    const rows = userTransactions.length
      ? userTransactions.map((t) => `
          <tr>
            <td>${dateValue(t.createdAt)}</td>
            <td>${t.type || "-"}</td>
            <td>${t.method || t.network || "-"}</td>
            <td>${t.status || "-"}</td>
            <td>${moneyValue(t.amount)}</td>
          </tr>
        `).join("")
      : `
          <tr>
            <td colspan="5" style="text-align:center">No transaction records found.</td>
          </tr>
        `;

    const win = window.open("", "_blank", "width=1000,height=800");

    if (!win) {
      setMessage("Please allow pop-ups to download the statement.");
      return;
    }

    win.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Tradenex Account Statement - ${name}</title>
        <style>
          * { box-sizing: border-box; }
          body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 32px;
            color: #111827;
            background: #fff;
          }
          .head {
            display: flex;
            justify-content: space-between;
            border-bottom: 2px solid #111827;
            padding-bottom: 18px;
            margin-bottom: 22px;
          }
          .brand {
            font-size: 28px;
            font-weight: 800;
          }
          .sub {
            color: #6b7280;
            margin-top: 5px;
          }
          .user {
            text-align: right;
            font-size: 13px;
          }
          .cards {
            display: grid;
            grid-template-columns: repeat(5, 1fr);
            gap: 10px;
            margin-bottom: 25px;
          }
          .card {
            border: 1px solid #d1d5db;
            border-radius: 8px;
            padding: 14px;
          }
          .label {
            color: #6b7280;
            font-size: 11px;
            margin-bottom: 7px;
          }
          .value {
            font-size: 17px;
            font-weight: 700;
          }
          h2 {
            font-size: 18px;
            margin: 24px 0 10px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 12px;
          }
          th, td {
            border: 1px solid #d1d5db;
            padding: 9px;
            text-align: left;
          }
          th {
            background: #f3f4f6;
          }
          .footer {
            margin-top: 30px;
            padding-top: 12px;
            border-top: 1px solid #d1d5db;
            color: #6b7280;
            font-size: 11px;
          }
          @media print {
            body { padding: 18px; }
            @page { size: A4; margin: 12mm; }
          }
        </style>
      </head>
      <body>
        <div class="head">
          <div>
            <div class="brand">TRADENEX</div>
            <div class="sub">Official Account Statement</div>
          </div>
          <div class="user">
            <b>${name}</b><br>
            User ID: ${uid}<br>
            ${statementUser.email || "-"}<br>
            ${statementUser.mobile || statementUser.phone || "-"}
          </div>
        </div>

        <div class="cards">
          <div class="card">
            <div class="label">TOTAL DEPOSIT</div>
            <div class="value">${moneyValue(statementUser.balance !== undefined ? statementUser.totalDeposit : userDeposits.filter(d => d.status === "Approved").reduce((a,d) => a + Number(d.amount || 0), 0))}</div>
          </div>

          <div class="card">
            <div class="label">TOTAL PROFIT</div>
            <div class="value">${moneyValue(statementUser.profit)}</div>
          </div>

          <div class="card">
            <div class="label">TOTAL WITHDRAWAL</div>
            <div class="value">${moneyValue(userWithdrawals.filter(w => w.status === "Approved").reduce((a,w) => a + Number(w.amount || 0), 0))}</div>
          </div>

          <div class="card">
            <div class="label">REFERRAL REWARD</div>
            <div class="value">${moneyValue(statementUser.referralReward)}</div>
          </div>

          <div class="card">
            <div class="label">CURRENT BALANCE</div>
            <div class="value">${moneyValue(statementUser.balance)}</div>
          </div>
        </div>

        <h2>Transaction History</h2>

        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Type</th>
              <th>Method / Network</th>
              <th>Status</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>

        <div class="footer">
          Generated by Tradenex Admin • ${new Date().toLocaleString()}
        </div>

        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 400);
          };
        </script>
      </body>
      </html>
    `);

    win.document.close();
  }

  async function saveUserEdit() {
    try {
      setLoading(true);

      const data = await api(
        `/api/admin/users/${selectedUser.id}`,
        {
          method: "PUT",
          body: JSON.stringify({
            name: userForm.name,
            email: userForm.email,
            mobile: userForm.mobile,
            aadhaar: userForm.aadhaar,
            address: userForm.address,
          }),
        }
      );

      setUsers((prev) =>
        prev.map((u) =>
          u.id === selectedUser.id
            ? { ...u, ...data.user }
            : u
        )
      );

      setUserModal("");
      setSelectedUser(null);
      setMessage("User details updated successfully.");
    } catch (e) {
      setMessage(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function saveUserPassword() {
    if (!userForm.password || userForm.password.length < 6) {
      setMessage("Password must be at least 6 characters.");
      return;
    }

    try {
      setLoading(true);

      await api(
        `/api/admin/users/${selectedUser.id}/password`,
        {
          method: "PUT",
          body: JSON.stringify({
            password: userForm.password,
          }),
        }
      );

      setUserModal("");
      setSelectedUser(null);
      setMessage("Password changed successfully.");
    } catch (e) {
      setMessage(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function saveUserBalance() {
    const balance = Number(userForm.balance);

    if (!Number.isFinite(balance) || balance < 0) {
      setMessage("Enter a valid balance.");
      return;
    }

    try {
      setLoading(true);

      const data = await api(
        `/api/admin/users/${selectedUser.id}/balance`,
        {
          method: "PUT",
          body: JSON.stringify({ balance }),
        }
      );

      setUsers((prev) =>
        prev.map((u) =>
          u.id === selectedUser.id
            ? { ...u, ...data.user }
            : u
        )
      );

      setUserModal("");
      setSelectedUser(null);
      setMessage("Balance updated successfully.");
    } catch (e) {
      setMessage(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function toggleUserStatus(user) {
    const nextStatus =
      user.status === "Inactive"
        ? "Active"
        : "Inactive";

    try {
      setLoading(true);

      const data = await api(
        `/api/admin/users/${user.id}/status`,
        {
          method: "PUT",
          body: JSON.stringify({
            status: nextStatus,
          }),
        }
      );

      setUsers((prev) =>
        prev.map((u) =>
          u.id === user.id
            ? { ...u, ...data.user }
            : u
        )
      );

      setMessage(`User ${nextStatus.toLowerCase()}.`);
    } catch (e) {
      setMessage(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function deleteUser(user) {
    const ok = window.confirm(
      `Delete user "${user.name || user.email || user.id}"? This cannot be undone.`
    );

    if (!ok) return;

    try {
      setLoading(true);

      await api(
        `/api/admin/users/${user.id}`,
        {
          method: "DELETE",
        }
      );

      setUsers((prev) =>
        prev.filter((u) => u.id !== user.id)
      );

      setMessage("User deleted successfully.");
    } catch (e) {
      setMessage(e.message);
    } finally {
      setLoading(false);
    }
  }

  function adminLogin(e) {
    e.preventDefault();

    if (
      login.email === "admin@tradenex.com" &&
      login.password === "admin123"
    ) {
      localStorage.setItem(
        "tradenex_admin",
        "1"
      );

      setLogged(true);
      setMessage("");
    } else {
      setMessage(
        "Invalid admin email or password."
      );
    }
  }

  function logout() {
    localStorage.removeItem(
      "tradenex_admin"
    );

    setLogged(false);
    setPage("dashboard");
  }

  async function action(
    path,
    successMessage
  ) {
    try {
      setLoading(true);
      setMessage("");

      const result = await api(path, {
        method: "POST",
      });

      setMessage(
        result.message || successMessage
      );

      await loadAdminData();
    } catch (e) {
      setMessage(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function deleteDeposit(deposit) {
    const confirmed = window.confirm(
      `Delete this deposit of ${money(deposit.amount)}?\\n\\nIf approved, the user's balance, total deposit and referral commissions will be reversed.`
    );

    if (!confirmed) return;

    try {
      setLoading(true);
      setMessage("");

      const result = await api(
        `/api/admin/deposits/${deposit.id}`,
        {
          method: "DELETE",
        }
      );

      setMessage(
        result.message || "Deposit deleted."
      );

      await loadAdminData();
    } catch (e) {
      setMessage(e.message);
    } finally {
      setLoading(false);
    }
  }

  if (!logged) {
    return (
      <AdminLogin
        value={login}
        setValue={setLogin}
        submit={adminLogin}
        message={message}
      />
    );
  }

  const pendingDeposits =
    deposits.filter(
      (x) => x.status === "Pending"
    ).length;

  const pendingWithdrawals =
    withdrawals.filter(
      (x) => x.status === "Pending"
    ).length;

  const totalBalance = users.reduce(
    (sum, u) =>
      sum + Number(u.balance || 0),
    0
  );

  const referralRewards = users.reduce(
    (sum, u) =>
      sum +
      Number(u.referralReward || 0),
    0
  );

  return (
    <div className="admin-app">
      <aside
        className={`admin-sidebar ${
          sidebar ? "open" : ""
        }`}
      >
        <div className="admin-brand">
          <span>₮</span>
          <b>Tradenex</b>
          <small>ADMIN PANEL</small>
        </div>

        <div className="admin-menu-title">
          MAIN MENU
        </div>

          <AdminMenu
            icon="🎁"
            text="Offers"
            active={page === "offers"}
            onClick={() => {
              setPage("offers");
              setSidebar(false);
            }}
          />

        <AdminMenu
          icon="⌂"
          text="Dashboard"
          active={page === "dashboard"}
          onClick={() => {
            setPage("dashboard");
            setSidebar(false);
          }}
        />

        <AdminMenu
          icon="👥"
          text="Users"
          active={page === "users"}
          onClick={() => {
            setPage("users");
            setSidebar(false);
          }}
        />

        <AdminMenu
          icon="↓"
          text="Deposits"
          active={page === "deposits"}
          badge={pendingDeposits}
          onClick={() => {
            setPage("deposits");
            setSidebar(false);
          }}
        />

        <AdminMenu
          icon="↗"
          text="Withdrawals"
          active={page === "withdrawals"}
          badge={pendingWithdrawals}
          onClick={() => {
            setPage("withdrawals");
            setSidebar(false);
          }}
        />

        <AdminMenu
          icon="🎁"
          text="Referral Rewards"
          active={page === "rewards"}
          onClick={() => {
            setPage("rewards");
            setSidebar(false);
          }}
        />

        <AdminMenu
          icon="⇄"
          text="Transactions"
          active={page === "transactions"}
          onClick={() => {
            setPage("transactions");
            setSidebar(false);
          }}
        />

        <AdminMenu
          icon="🎫"
          text="Support"
          active={page === "support"}
          onClick={() => {
            setPage("support");
            setSidebar(false);
          }}
        />

        <div className="admin-bottom">
          <button onClick={logout}>
            ↪ Logout
          </button>
        </div>
      </aside>

      {sidebar && (
        <div
          className="admin-overlay"
          onClick={() => setSidebar(false)}
        />
      )}

      <main className="admin-main">
        <header className="admin-topbar">
          <button
            className="admin-hamburger"
            onClick={() => setSidebar(true)}
          >
            ☰
          </button>

          <div>
            <h2>{adminTitle(page)}</h2>

            <small>
              Tradenex Administration
            </small>
          </div>

          <div
            className="admin-user"
            style={{
              position: "relative",
            }}
          >
            <div
              className="admin-notification-wrap"
              style={{
                position: "relative",
              }}
            >
              <button
                className="admin-notification-bell"
                onClick={() =>
                  setNotificationOpen(
                    (open) => !open
                  )
                }
                style={{
                  position: "relative",
                  border: "0",
                  background: "transparent",
                  cursor: "pointer",
                  fontSize: "22px",
                  padding: "8px",
                  marginRight: "8px",
                }}
                aria-label="Notifications"
              >
                🔔

                {notificationUnread > 0 && (
                  <span
                    style={{
                      position: "absolute",
                      top: "0",
                      right: "0",
                      minWidth: "18px",
                      height: "18px",
                      padding: "0 4px",
                      borderRadius: "10px",
                      background: "#ef4444",
                      color: "#fff",
                      fontSize: "11px",
                      fontWeight: "700",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      lineHeight: "18px",
                    }}
                  >
                    {notificationUnread > 99
                      ? "99+"
                      : notificationUnread}
                  </span>
                )}
              </button>

              {notificationOpen && (
                <div
                  style={{
                    position: "absolute",
                    top: "48px",
                    right: "0",
                    width: "340px",
                    maxWidth: "calc(100vw - 30px)",
                    background: "#fff",
                    border: "1px solid #e5e7eb",
                    borderRadius: "14px",
                    boxShadow:
                      "0 12px 35px rgba(0,0,0,.18)",
                    zIndex: 9999,
                    overflow: "hidden",
                    color: "#111827",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "14px 16px",
                      borderBottom:
                        "1px solid #e5e7eb",
                    }}
                  >
                    <b>
                      Notifications
                    </b>

                    {notificationUnread > 0 && (
                      <button
                        onClick={
                          markAllNotificationsRead
                        }
                        style={{
                          border: "0",
                          background: "transparent",
                          cursor: "pointer",
                          fontSize: "12px",
                          fontWeight: "600",
                        }}
                      >
                        Mark all read
                      </button>
                    )}
                  </div>

                  <div
                    style={{
                      maxHeight: "380px",
                      overflowY: "auto",
                    }}
                  >
                    {notifications.length === 0 ? (
                      <div
                        style={{
                          padding: "30px 16px",
                          textAlign: "center",
                          color: "#6b7280",
                          fontSize: "14px",
                        }}
                      >
                        No notifications
                      </div>
                    ) : (
                      notifications.map(
                        (notification) => (
                          <button
                            key={notification.id}
                            onClick={() => {
                              openAdminNotification(
                                notification
                              );
                            }}
                            style={{
                              width: "100%",
                              display: "block",
                              textAlign: "left",
                              border: "0",
                              borderBottom:
                                "1px solid #f0f0f0",
                              background:
                                notification.read
                                  ? "#fff"
                                  : "#f5f9ff",
                              cursor:
                                notification.read
                                  ? "default"
                                  : "pointer",
                              padding:
                                "13px 16px",
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                gap: "10px",
                              }}
                            >
                              <span
                                style={{
                                  fontSize: "19px",
                                }}
                              >
                                {notification.type ===
                                "new_user"
                                  ? "👤"
                                  : notification.type ===
                                    "deposit"
                                  ? "💰"
                                  : notification.type ===
                                    "withdrawal"
                                  ? "💸"
                                  : notification.type ===
                                    "support"
                                  ? "🎫"
                                  : "🔔"}
                              </span>

                              <div
                                style={{
                                  flex: 1,
                                }}
                              >
                                <div
                                  style={{
                                    display: "flex",
                                    alignItems:
                                      "center",
                                    gap: "7px",
                                  }}
                                >
                                  <b
                                    style={{
                                      fontSize: "13px",
                                    }}
                                  >
                                    {
                                      notification.title
                                    }
                                  </b>

                                  {!notification.read && (
                                    <span
                                      style={{
                                        width: "7px",
                                        height: "7px",
                                        borderRadius:
                                          "50%",
                                        background:
                                          "#ef4444",
                                      }}
                                    />
                                  )}
                                </div>

                                <div
                                  style={{
                                    marginTop: "4px",
                                    fontSize: "12px",
                                    lineHeight: "1.4",
                                    color: "#6b7280",
                                  }}
                                >
                                  {
                                    notification.message
                                  }
                                </div>

                                <small
                                  style={{
                                    display: "block",
                                    marginTop: "5px",
                                    color: "#9ca3af",
                                  }}
                                >
                                  {new Date(
                                    notification.createdAt
                                  ).toLocaleString()}
                                </small>
                              </div>
                            </div>
                          </button>
                        )
                      )
                    )}
                  </div>
                </div>
              )}
            </div>

            <span>🔐</span>

            <div>
              <b>Administrator</b>

              <small>
                admin@tradenex.com
              </small>
            </div>

            <button onClick={logout}>
              Logout
            </button>
          </div>
        </header>

        {message && (
          <div className="admin-notice">
            {message}

            <button
              onClick={() => setMessage("")}
            >
              ×
            </button>
          </div>
        )}

        <section className="admin-content">
          {page === "dashboard" && (
            <Dashboard
              users={users}
              deposits={deposits}
              withdrawals={withdrawals}
              totalBalance={totalBalance}
              pendingDeposits={pendingDeposits}
              pendingWithdrawals={
                pendingWithdrawals
              }
              referralRewards={
                referralRewards
              }
            />
          )}

          {page === "users" && (
            <Users
              users={users}
              openUserEdit={openUserEdit}
              openUserStatement={openUserStatement}
              openUserPassword={(user) => {
                setSelectedUser(user);
                setUserForm((f) => ({
                  ...f,
                  password: "",
                }));
                setUserModal("password");
              }}
              openUserBalance={(user) => {
                setSelectedUser(user);
                setUserForm((f) => ({
                  ...f,
                  balance: user.balance ?? 0,
                }));
                setUserModal("balance");
              }}
              toggleUserStatus={toggleUserStatus}
              deleteUser={deleteUser}
            />
          )}

          {page === "deposits" && (
            <Deposits
              deposits={deposits}
              users={users}
              action={action}
              loading={loading}
            />
          )}

          {page === "withdrawals" && (
            <Withdrawals
              withdrawals={withdrawals}
              users={users}
              action={action}
              loading={loading}
            />
          )}

          {page === "rewards" && (
            <Rewards users={users} />
          )}

          {page === "transactions" && (
            <Transactions
              transactions={transactions}
            />
          )}

          {page === "offers" && (
          <Offers api={api} />
        )}

        {page === "support" && (
            <Support
              tickets={support}
              openTicketId={
                supportOpenTicketId
              }
              onTicketOpened={() =>
                setSupportOpenTicketId(null)
              }
            />
          )}
        </section>

      {userModal === "edit" && selectedUser && (
        <div className="admin-modal-overlay">
          <div className="admin-modal">
            <h3>Edit User</h3>

            {[
              ["name", "Name"],
              ["email", "Email"],
              ["mobile", "Mobile"],
              ["aadhaar", "Aadhaar"],
              ["address", "Address"],
            ].map(([key, label]) => (
              <input
                key={key}
                value={userForm[key]}
                placeholder={label}
                onChange={(e) =>
                  setUserForm({
                    ...userForm,
                    [key]: e.target.value,
                  })
                }
              />
            ))}

            <div style={{ display: "flex", gap: "8px" }}>
              <button
                type="button"
                onClick={saveUserEdit}
              >
                Save Changes
              </button>

              <button
                type="button"
                onClick={() => {
                  setUserModal("");
                  setSelectedUser(null);
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {userModal === "password" && selectedUser && (
        <div className="admin-modal-overlay">
          <div className="admin-modal">
            <h3>Change Password</h3>

            <input
              type="password"
              value={userForm.password}
              placeholder="New password"
              onChange={(e) =>
                setUserForm({
                  ...userForm,
                  password: e.target.value,
                })
              }
            />

            <div style={{ display: "flex", gap: "8px" }}>
              <button
                type="button"
                onClick={saveUserPassword}
              >
                Change Password
              </button>

              <button
                type="button"
                onClick={() => {
                  setUserModal("");
                  setSelectedUser(null);
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {userModal === "balance" && selectedUser && (
        <div className="admin-modal-overlay">
          <div className="admin-modal">
            <h3>Set User Balance</h3>

            <input
              type="number"
              min="0"
              step="0.01"
              value={userForm.balance}
              placeholder="Balance"
              onChange={(e) =>
                setUserForm({
                  ...userForm,
                  balance: e.target.value,
                })
              }
            />

            <div style={{ display: "flex", gap: "8px" }}>
              <button
                type="button"
                onClick={saveUserBalance}
              >
                Save Balance
              </button>

              <button
                type="button"
                onClick={() => {
                  setUserModal("");
                  setSelectedUser(null);
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      {userModal === "statement" && statementUser && (
        <div
          className="admin-modal-backdrop"
          onClick={closeUserStatement}
        >
          <div
            className="admin-modal"
            style={{ maxWidth: "1100px", width: "96%" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="admin-modal-head">
              <div>
                <h2>Account Statement</h2>
                <p>
                  {statementUser.name ||
                    `${statementUser.firstName || ""} ${
                      statementUser.lastName || ""
                    }`.trim() ||
                    "User"}
                  {" • "}
                  {statementUser.id}
                </p>
              </div>

              <button
                type="button"
                onClick={closeUserStatement}
              >
                ✕
              </button>
            </div>

            <div
              className="admin-stats"
              style={{
                gridTemplateColumns:
                  "repeat(auto-fit,minmax(150px,1fr))",
                marginBottom: "20px",
              }}
            >
              <AdminStat
                icon="💰"
                title="Total Deposit"
                value={money(
                  deposits
                    .filter(
                      (d) =>
                        d.userId === statementUser.id &&
                        d.status === "Approved"
                    )
                    .reduce(
                      (sum, d) =>
                        sum + Number(d.amount || 0),
                      0
                    )
                )}
              />

              <AdminStat
                icon="📈"
                title="Total Profit"
                value={money(statementUser.profit)}
              />

              <AdminStat
                icon="💸"
                title="Total Withdrawal"
                value={money(
                  withdrawals
                    .filter(
                      (w) =>
                        w.userId === statementUser.id &&
                        w.status === "Approved"
                    )
                    .reduce(
                      (sum, w) =>
                        sum + Number(w.amount || 0),
                      0
                    )
                )}
              />

              <AdminStat
                icon="🎁"
                title="Referral Reward"
                value={money(
                  statementUser.referralReward
                )}
              />

              <AdminStat
                icon="💵"
                title="Current Balance"
                value={money(statementUser.balance)}
              />
            </div>

            <div className="admin-panel">
              <div className="admin-panel-head">
                <h3>Transaction History</h3>
                <span>
                  {
                    transactions.filter(
                      (t) =>
                        t.userId ===
                        statementUser.id
                    ).length
                  } records
                </span>
              </div>

              <div className="admin-table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Type</th>
                      <th>Method</th>
                      <th>Status</th>
                      <th>Amount</th>
                    </tr>
                  </thead>

                  <tbody>
                    {transactions
                      .filter(
                        (t) =>
                          t.userId ===
                          statementUser.id
                      )
                      .sort(
                        (a, b) =>
                          new Date(
                            b.createdAt
                          ) -
                          new Date(
                            a.createdAt
                          )
                      )
                      .map((t) => (
                        <tr key={t.id || t.txnId}>
                          <td>
                            {t.createdAt
                              ? new Date(
                                  t.createdAt
                                ).toLocaleString()
                              : "-"}
                          </td>

                          <td>
                            <b>{t.type || "-"}</b>
                          </td>

                          <td>
                            {t.method ||
                              t.network ||
                              "-"}
                          </td>

                          <td>
                            {t.status || "-"}
                          </td>

                          <td>
                            {money(t.amount)}
                          </td>
                        </tr>
                      ))}

                    {!transactions.some(
                      (t) =>
                        t.userId ===
                        statementUser.id
                    ) && (
                      <tr>
                        <td
                          colSpan="5"
                          style={{
                            textAlign: "center",
                          }}
                        >
                          No transaction records found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "10px",
                marginTop: "18px",
                flexWrap: "wrap",
              }}
            >
              <button
                type="button"
                onClick={closeUserStatement}
              >
                Close
              </button>

              <button
                type="button"
                onClick={printUserStatement}
              >
                🖨️ Download / Save PDF
              </button>
            </div>
          </div>
        </div>
      )}

      </main>
    </div>
  );
}

/* =====================================================
   ADMIN LOGIN
===================================================== */

function AdminLogin({
  value,
  setValue,
  submit,
  message,
}) {
  return (
    <div className="admin-login">
      <div className="admin-login-card">
        <div className="admin-login-logo">
          <span>₮</span>
          <b>Tradenex</b>
        </div>

        <div className="admin-login-label">
          ADMINISTRATION
        </div>

        <h1>Admin Login</h1>

        {message && (
          <div className="login-error">
            {message}
          </div>
        )}

        <form onSubmit={submit}>
          <label>Email</label>

          <input
            type="email"
            value={value.email}
            onChange={(e) =>
              setValue({
                ...value,
                email: e.target.value,
              })
            }
            placeholder="Admin email"
            required
          />

          <label>Password</label>

          <input
            type="password"
            value={value.password}
            onChange={(e) =>
              setValue({
                ...value,
                password: e.target.value,
              })
            }
            placeholder="Admin password"
            required
          />

          <button className="admin-primary">
            Login to Admin Panel
          </button>
        </form>

        <div className="demo-login">
          Demo login:
          <br />
          admin@tradenex.com
          <br />
          admin123
        </div>
      </div>
    </div>
  );
}

/* =====================================================
   MENU
===================================================== */

function AdminMenu({
  icon,
  text,
  active,
  badge,
  onClick,
}) {
  return (
    <button
      className={`admin-menu ${
        active ? "active" : ""
      }`}
      onClick={onClick}
    >
      <span>{icon}</span>

      <b>{text}</b>

      {badge > 0 && <em>{badge}</em>}
    </button>
  );
}

/* =====================================================
   DASHBOARD
===================================================== */

function Dashboard({
  users,
  deposits,
  withdrawals,
  totalBalance,
  pendingDeposits,
  pendingWithdrawals,
  referralRewards,
}) {
  return (
    <>
      <div className="admin-page-head">
        <span>ADMIN OVERVIEW</span>

        <h1>Dashboard</h1>

        <p>
          Manage your Tradenex user
          platform.
        </p>
      </div>

      <div className="admin-stats">
        <AdminStat
          icon="👥"
          title="Total Users"
          value={users.length}
        />

        <AdminStat
          icon="💰"
          title="Total User Balance"
          value={money(totalBalance)}
        />

        <AdminStat
          icon="⏳"
          title="Pending Deposits"
          value={pendingDeposits}
        />

        <AdminStat
          icon="↗"
          title="Pending Withdrawals"
          value={pendingWithdrawals}
        />

        <AdminStat
          icon="🎁"
          title="Referral Rewards"
          value={money(referralRewards)}
        />

        <AdminStat
          icon="⇄"
          title="Transactions"
          value={
            deposits.length +
            withdrawals.length
          }
        />
      </div>

      <div className="admin-grid-two">
        <div className="admin-panel">
          <h3>Pending Deposits</h3>

          <p>
            {pendingDeposits} deposit
            request(s) waiting for
            review.
          </p>
        </div>

        <div className="admin-panel">
          <h3>Pending Withdrawals</h3>

          <p>
            {pendingWithdrawals} withdrawal
            request(s) waiting for
            approval.
          </p>
        </div>
      </div>
    </>
  );
}

function AdminStat({
  icon,
  title,
  value,
}) {
  return (
    <div className="admin-stat">
      <div className="admin-stat-icon">
        {icon}
      </div>

      <strong>{value}</strong>

      <span>{title}</span>
    </div>
  );
}

/* =====================================================
   USERS
===================================================== */

function Users({
  users,
  openUserEdit,
  openUserStatement,
  openUserPassword,
  openUserBalance,
  toggleUserStatus,
  deleteUser,
}) {
  return (
    <div className="admin-panel">
      <div className="admin-panel-head">
        <div>
          <h3>All Users</h3>
          <span>{users.length} users</span>
        </div>

        <button
          type="button"
          onClick={() => {
            const backup = {
              exportedAt: new Date().toISOString(),
              totalUsers: users.length,
              users: users,
            };

            const blob = new Blob(
              [JSON.stringify(backup, null, 2)],
              { type: "application/json" }
            );

            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");

            link.href = url;
            link.download =
              `tradenex-users-backup-${new Date()
                .toISOString()
                .slice(0, 10)}.json`;

            document.body.appendChild(link);
            link.click();
            link.remove();
            URL.revokeObjectURL(url);
          }}
        >
          Backup Users
        </button>
      </div>

      {!users.length ? (
        <div className="admin-empty">
          No users found.
        </div>
      ) : (
        <div className="admin-table-wrap">
          <table>
            <thead>
              <tr>
                <th>User</th>
                <th>Email</th>
                <th>Mobile</th>
                <th>Balance</th>
                <th>Profit</th>
                <th>Reward</th>
                <th>Referral Code</th>
                <th>Referrals</th>
                <th>Status</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>
                    <b>
                      {u.name ||
                        `${u.firstName || ""} ${
                          u.lastName || ""
                        }`.trim() ||
                        "User"}
                    </b>
                    <small>{u.id}</small>
                  </td>

                  <td>{u.email || "-"}</td>

                  <td>
                    {u.mobile || u.phone || "-"}
                  </td>

                  <td>{money(u.balance)}</td>

                  <td>{money(u.profit)}</td>

                  <td>{money(u.referralReward)}</td>

                  <td>
                    <span className="ref-code">
                      {u.referralCode || "-"}
                    </span>
                  </td>

                  <td>
                    {(u.referrals || []).length}
                  </td>

                  <td>
                    <span>
                      {u.status || "Active"}
                    </span>
                  </td>

                  <td>
                    {u.createdAt
                      ? new Date(
                          u.createdAt
                        ).toLocaleDateString()
                      : "-"}
                  </td>

                  <td>
                    <div
                      style={{
                        display: "flex",
                        gap: "6px",
                        flexWrap: "wrap",
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => openUserEdit(u)}
                      >
                        Edit
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          openUserPassword(u)
                        }
                      >
                        Password
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          openUserBalance(u)
                        }
                      >
                        Balance
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          openUserStatement(u)
                        }
                      >
                        Statement
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          toggleUserStatus(u)
                        }
                      >
                        {u.status === "Inactive"
                          ? "Activate"
                          : "Deactivate"}
                      </button>

                      <button
                        type="button"
                        onClick={() => deleteUser(u)}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}


/* =====================================================
   DEPOSITS
===================================================== */

function Deposits({
  deposits,
  users,
  action,
  loading,
}) {
  function findUser(id) {
    return users.find(
      (u) => u.id === id
    );
  }

  return (
    <div className="admin-panel">
      <div className="admin-panel-head">
        <h3>Deposit Requests</h3>

        <span>
          Payment proofs included
        </span>
      </div>

      {!deposits.length ? (
        <div className="admin-empty">
          No deposit requests.
        </div>
      ) : (
        <div className="admin-table-wrap">
          <table>
            <thead>
              <tr>
                <th>User</th>
                <th>Method</th>
                <th>Network</th>
                <th>Amount</th>
                <th>TXID</th>
                <th>Payment Proof</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {deposits.map((d) => {
                const user = findUser(
                  d.userId
                );

                return (
                  <tr key={d.id}>
                    <td>
                      <div className="deposit-user">
                        <b>
                          {user?.name ||
                            d.userId}
                        </b>

                        <small>
                          {user?.email ||
                            d.userId}
                        </small>
                      </div>
                    </td>

                    <td>
                      {d.method || "-"}
                    </td>

                    <td>
                      {d.network || "-"}
                    </td>

                    <td>
                      <b>
                        {money(d.amount)}
                      </b>
                    </td>

                    <td>
                      <div className="txid-cell">
                        {d.txid ? (
                          <>
                            <span>
                              {d.txid}
                            </span>

                            <button
                              type="button"
                              className="copy-btn"
                              onClick={() => {
                                if (
                                  navigator.clipboard
                                ) {
                                  navigator.clipboard.writeText(
                                    d.txid
                                  );
                                }
                              }}
                            >
                              Copy
                            </button>
                          </>
                        ) : (
                          "-"
                        )}
                      </div>
                    </td>

                    <td>
                      <PaymentProof
                        proof={d.proof}
                      />
                    </td>

                    <td>
                      <Status
                        status={d.status}
                      />
                    </td>

                    <td>
                      <div className="actions">
                        {d.status === "Pending" && (
                          <>
                            <button
                              className="approve"
                              disabled={loading}
                              onClick={() =>
                                action(
                                  `/api/admin/deposits/${d.id}/approve`,
                                  "Deposit approved."
                                )
                              }
                            >
                              Approve
                            </button>

                            <button
                              className="reject"
                              disabled={loading}
                              onClick={() =>
                                action(
                                  `/api/admin/deposits/${d.id}/reject`,
                                  "Deposit rejected."
                                )
                              }
                            >
                              Reject
                            </button>
                          </>
                        )}

                        <button
                          className="reject"
                          disabled={loading}
                          onClick={() =>
                            deleteDeposit(d)
                          }
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* =====================================================
   PAYMENT PROOF
===================================================== */

function PaymentProof({ proof }) {
  if (!proof) {
    return (
      <span className="proof-missing">
        No proof
      </span>
    );
  }

  const proofUrl = proof.startsWith(
    "http"
  )
    ? proof
    : `${API}${proof}`;

  return (
    <div
      style={{
        width: "90px",
        minWidth: "90px",
        maxWidth: "90px",
        textAlign: "center",
      }}
    >
      <img
        src={proofUrl}
        alt="Payment proof"
        onClick={() =>
          window.open(
            proofUrl,
            "_blank"
          )
        }
        style={{
          width: "80px",
          height: "80px",
          objectFit: "cover",
          display: "block",
          borderRadius: "8px",
          border:
            "1px solid rgba(255,255,255,0.15)",
          cursor: "pointer",
          margin: "0 auto 6px",
        }}
        onError={(e) => {
          e.currentTarget.style.display =
            "none";
        }}
      />

      <button
        type="button"
        onClick={() =>
          window.open(
            proofUrl,
            "_blank"
          )
        }
        style={{
          width: "80px",
          padding: "5px 3px",
          fontSize: "11px",
          lineHeight: "14px",
          border: "0",
          borderRadius: "5px",
          cursor: "pointer",
          whiteSpace: "nowrap",
        }}
      >
        View Proof
      </button>
    </div>
  );
}

/* =====================================================
   WITHDRAWALS
===================================================== */

function Withdrawals({
  withdrawals,
  users,
  action,
  loading,
}) {
  function findUser(id) {
    return users.find(
      (u) => u.id === id
    );
  }

  return (
    <div className="admin-panel">
      <div className="admin-panel-head">
        <h3>
          Withdrawal Requests
        </h3>

        <span>
          Balance / Profit / Reward
        </span>
      </div>

      {!withdrawals.length ? (
        <div className="admin-empty">
          No withdrawal requests.
        </div>
      ) : (
        <div className="admin-table-wrap">
          <table>
            <thead>
              <tr>
                <th>User</th>
                <th>Source</th>
                <th>Amount</th>
                <th>Network</th>
                <th>Wallet</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {withdrawals.map((w) => {
                const user = findUser(
                  w.userId
                );

                return (
                  <tr key={w.id}>
                    <td>
                      <div className="deposit-user">
                        <b>
                          {user?.name ||
                            w.userId}
                        </b>

                        <small>
                          {user?.email ||
                            w.userId}
                        </small>
                      </div>
                    </td>

                    <td>
                      <SourceBadge
                        source={
                          w.source ||
                          "balance"
                        }
                      />
                    </td>

                    <td>
                      <b>
                        {money(w.amount)}
                      </b>
                    </td>

                    <td>
                      {w.network || "-"}
                    </td>

                    <td className="wallet-cell">
                      {w.walletAddress ||
                        "-"}
                    </td>

                    <td>
                      <Status
                        status={w.status}
                      />
                    </td>

                    <td>
                      {w.status ===
                      "Pending" ? (
                        <div className="actions">
                          <button
                            className="approve"
                            disabled={loading}
                            onClick={() =>
                              action(
                                `/api/admin/withdrawals/${w.id}/approve`,
                                "Withdrawal approved."
                              )
                            }
                          >
                            Approve
                          </button>

                          <button
                            className="reject"
                            disabled={loading}
                            onClick={() =>
                              action(
                                `/api/admin/withdrawals/${w.id}/reject`,
                                "Withdrawal rejected."
                              )
                            }
                          >
                            Reject
                          </button>
                        </div>
                      ) : (
                        "-"
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* =====================================================
   SOURCE BADGE
===================================================== */

function SourceBadge({ source }) {
  if (
    source ===
    "referralReward"
  ) {
    return (
      <span className="source reward">
        🎁 Referral Reward
      </span>
    );
  }

  if (source === "profit") {
    return (
      <span className="source profit">
        📈 Profit
      </span>
    );
  }

  return (
    <span className="source balance">
      💰 Wallet Balance
    </span>
  );
}

/* =====================================================
   REWARDS
===================================================== */

function Rewards({ users }) {
  const eligible = users.filter((u) =>
    (u.referrals || []).filter(
      (r) => r.qualifying === true
    ).length >= 3
  );

  const totalRewards = users.reduce(
    (sum, u) =>
      sum + Number(u.referralReward || 0),
    0
  );

  const totalReferralVolume = users.reduce(
    (sum, u) =>
      sum + Number(u.referralVolume || 0),
    0
  );

  const milestones = [
    {
      id: "iphone",
      volume: 10000,
      reward: "iPhone",
    },
    {
      id: "bullet",
      volume: 20000,
      reward: "Royal Enfield Bullet",
    },
    {
      id: "car",
      volume: 50000,
      reward: "Maruti Swift / Baleno / Hyundai i20",
    },
  ];

  const milestoneStats = milestones.map(
    (milestone) => ({
      ...milestone,
      users: users.filter((u) =>
        Array.isArray(u.referralMilestones) &&
        u.referralMilestones.some(
          (m) => m.id === milestone.id
        )
      ).length,
    })
  );

  return (
    <div className="admin-panel">
      <div className="admin-page-head">
        <span>
          REFERRAL SYSTEM
        </span>

        <h1>
          Referral Rewards
        </h1>

        <p>
          Multi-level commissions and milestone
          rewards based on approved qualifying
          referral deposits.
        </p>
      </div>

      <div className="reward-summary">
        <AdminStat
          icon="👥"
          title="Eligible Users"
          value={eligible.length}
        />

        <AdminStat
          icon="🎁"
          title="Total Commission Balance"
          value={money(totalRewards)}
        />

        <AdminStat
          icon="📊"
          title="Total Referral Volume"
          value={money(totalReferralVolume)}
        />
      </div>

      <div className="admin-panel">
        <div className="admin-page-head">
          <span>
            COMMISSION STRUCTURE
          </span>

          <h2>
            5-Level Referral Commission
          </h2>

          <p>
            Commission is credited only after
            an approved qualifying deposit.
          </p>
        </div>

        <div className="reward-summary">
          <AdminStat
            icon="1️⃣"
            title="Level 1"
            value="10%"
          />

          <AdminStat
            icon="2️⃣"
            title="Level 2"
            value="2%"
          />

          <AdminStat
            icon="3️⃣"
            title="Level 3"
            value="1%"
          />

          <AdminStat
            icon="4️⃣"
            title="Level 4"
            value="1%"
          />

          <AdminStat
            icon="5️⃣"
            title="Level 5"
            value="1%"
          />
        </div>

        <div className="referral-info">
          Total possible commission across
          Levels 1–5: <strong>15%</strong>
        </div>

        <div className="referral-info">
          Minimum qualifying deposit:
          <strong> $1,000 USDT</strong>
        </div>

        <div className="referral-info">
          Withdrawal unlock:
          <strong> 3 qualifying referrals</strong>
        </div>
      </div>

      <div className="admin-panel">
        <div className="admin-page-head">
          <span>
            MILESTONES
          </span>

          <h2>
            Referral Milestone Rewards
          </h2>

          <p>
            Milestones use combined qualifying
            referral deposit volume.
          </p>
        </div>

        <div className="reward-summary">
          {milestoneStats.map((m) => (
            <AdminStat
              key={m.id}
              icon={
                m.id === "iphone"
                  ? "📱"
                  : m.id === "bullet"
                  ? "🏍️"
                  : "🚗"
              }
              title={`$${m.volume.toLocaleString()} — ${m.reward}`}
              value={`${m.users} earned`}
            />
          ))}
        </div>
      </div>

      {!users.length ? (
        <div className="admin-empty">
          No users.
        </div>
      ) : (
        <div className="admin-table-wrap">
          <table>
            <thead>
              <tr>
                <th>User</th>
                <th>Referral Code</th>
                <th>Referrals</th>
                <th>Qualifying</th>
                <th>Volume</th>
                <th>Commission</th>
                <th>Milestones</th>
                <th>Eligibility</th>
              </tr>
            </thead>

            <tbody>
              {users.map((u) => {
                const referrals =
                  Array.isArray(u.referrals)
                    ? u.referrals
                    : [];

                const count =
                  referrals.length;

                const qualifyingCount =
                  referrals.filter(
                    (r) =>
                      r.qualifying === true
                  ).length;

                const volume =
                  Number(
                    u.referralVolume || 0
                  );

                const earnedMilestones =
                  Array.isArray(
                    u.referralMilestones
                  )
                    ? u.referralMilestones
                    : [];

                const ok =
                  qualifyingCount >= 3;

                return (
                  <tr key={u.id}>
                    <td>
                      <b>
                        {u.name ||
                          `${u.firstName || ""} ${
                            u.lastName || ""
                          }`.trim() ||
                          "User"}
                      </b>

                      <small>
                        {u.email}
                      </small>
                    </td>

                    <td>
                      <span className="ref-code">
                        {u.referralCode || "-"}
                      </span>
                    </td>

                    <td>
                      {count}
                    </td>

                    <td>
                      {qualifyingCount}
                    </td>

                    <td>
                      {money(volume)}
                    </td>

                    <td>
                      {money(
                        u.referralReward
                      )}
                    </td>

                    <td>
                      {earnedMilestones.length
                        ? earnedMilestones
                            .map(
                              (m) =>
                                m.reward ||
                                m.id
                            )
                            .join(", ")
                        : "—"}
                    </td>

                    <td>
                      {ok ? (
                        <span className="reward-ok">
                          ✓ Eligible
                        </span>
                      ) : (
                        <span className="reward-lock">
                          🔒 {3 - qualifyingCount} more
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* =====================================================
   TRANSACTIONS
===================================================== */

function Transactions({
  transactions,
}) {
  return (
    <div className="admin-panel">
      <div className="admin-panel-head">
        <h3>
          Transaction History
        </h3>
      </div>

      {!transactions.length ? (
        <div className="admin-empty">
          No transactions.
        </div>
      ) : (
        <div className="admin-table-wrap">
          <table>
            <thead>
              <tr>
                <th>TXN ID</th>
                <th>User</th>
                <th>Type</th>
                <th>Method</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Date</th>
              </tr>
            </thead>

            <tbody>
              {transactions.map((tx) => (
                <tr key={tx.id}>
                  <td>{tx.txnId || "-"}</td>

                  <td>{tx.userId || "-"}</td>

                  <td>{tx.type || "-"}</td>

                  <td>
                    {tx.network ||
                      tx.method ||
                      "-"}
                  </td>

                  <td>
                    {money(tx.amount)}
                  </td>

                  <td>
                    <Status
                      status={tx.status}
                    />
                  </td>

                  <td>
                    {tx.createdAt
                      ? new Date(
                          tx.createdAt
                        ).toLocaleString()
                      : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* =====================================================
   SUPPORT
===================================================== */

function Support({
  tickets,
  openTicketId = null,
  onTicketOpened = null,
}) {
  const [items, setItems] = useState(tickets || []);
  const [selected, setSelected] = useState(null);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    setItems(tickets || []);
  }, [tickets]);

  useEffect(() => {
    if (!openTicketId) return;

    const ticket = items.find(
      (item) =>
        String(item.id) ===
        String(openTicketId)
    );

    if (ticket) {
      setSelected(ticket);

      if (typeof onTicketOpened === "function") {
        onTicketOpened();
      }
    }
  }, [
    openTicketId,
    items,
  ]);

  async function sendReply() {
    if (!selected || !reply.trim()) {
      return;
    }

    setSending(true);
    setError("");
    setSuccess("");

    try {
      const data = await api(
        `/api/admin/support/${selected.id}/reply`,
        {
          method: "POST",
          body: JSON.stringify({
            reply: reply.trim(),
          }),
        }
      );

      if (!data.success) {
        throw new Error(
          data.message || "Reply failed."
        );
      }

      const updated = data.ticket;

      setItems((prev) =>
        prev.map((ticket) =>
          String(ticket.id) === String(updated.id)
            ? updated
            : ticket
        )
      );

      setSelected(updated);
      setReply("");
      setSuccess("Reply sent successfully.");
    } catch (err) {
      setError(
        err.message || "Unable to send reply."
      );
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="admin-panel">
      <div className="admin-panel-head">
        <h3>
          Support Tickets
        </h3>

        <span>
          {items.length} tickets
        </span>
      </div>

      {error && (
        <div className="error-box">
          {error}
        </div>
      )}

      {success && (
        <div className="success-box">
          {success}
        </div>
      )}

      {!items.length ? (
        <div className="admin-empty">
          No support tickets.
        </div>
      ) : (
        <div className="support-list">
          {items.map((ticket) => (
            <div
              className="support-card"
              key={ticket.id}
            >
              <div>
                <b>
                  {ticket.subject}
                </b>

                <small>
                  {ticket.userId}
                </small>
              </div>

              <p>
                {ticket.message}
              </p>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  marginTop: "10px",
                }}
              >
                <Status
                  status={ticket.status}
                />

                <button
                  type="button"
                  className="primary-btn"
                  onClick={() => {
                    setSelected(ticket);
                    setReply("");
                    setError("");
                    setSuccess("");
                  }}
                >
                  Open
                </button>
              </div>

              {selected &&
                String(selected.id) ===
                  String(ticket.id) && (
                  <div
                    style={{
                      marginTop: "15px",
                      paddingTop: "15px",
                      borderTop:
                        "1px solid rgba(255,255,255,0.08)",
                    }}
                  >
                    <h4>
                      Ticket Chat
                    </h4>

                    <div
                      style={{
                        maxHeight: "260px",
                        overflowY: "auto",
                        marginBottom: "12px",
                      }}
                    >
                      <div
                        style={{
                          padding: "10px",
                          marginBottom: "8px",
                          borderRadius: "8px",
                          background:
                            "rgba(255,255,255,0.04)",
                        }}
                      >
                        <small>
                          USER
                        </small>

                        <p>
                          {selected.message}
                        </p>
                      </div>

                      {Array.isArray(
                        selected.replies
                      ) &&
                        selected.replies.map(
                          (item) => (
                            <div
                              key={item.id}
                              style={{
                                padding: "10px",
                                marginBottom:
                                  "8px",
                                borderRadius:
                                  "8px",
                                background:
                                  "rgba(30,120,255,0.10)",
                              }}
                            >
                              <small>
                                ADMIN
                              </small>

                              <p>
                                {item.message}
                              </p>

                              <small>
                                {item.createdAt
                                  ? new Date(
                                      item.createdAt
                                    ).toLocaleString()
                                  : ""}
                              </small>
                            </div>
                          )
                        )}
                    </div>

                    <textarea
                      rows="4"
                      placeholder="Write reply to user..."
                      value={reply}
                      onChange={(e) =>
                        setReply(e.target.value)
                      }
                      disabled={sending}
                      style={{
                        width: "100%",
                        boxSizing: "border-box",
                        marginBottom: "10px",
                      }}
                    />

                    <div
                      style={{
                        display: "flex",
                        gap: "10px",
                      }}
                    >
                      <button
                        type="button"
                        className="primary-btn"
                        onClick={sendReply}
                        disabled={
                          sending ||
                          !reply.trim()
                        }
                      >
                        {sending
                          ? "Sending..."
                          : "Send Reply"}
                      </button>

                      <button
                        type="button"
                        className="secondary-btn"
                        onClick={() => {
                          setSelected(null);
                          setReply("");
                          setError("");
                          setSuccess("");
                        }}
                      >
                        Close
                      </button>
                    </div>
                  </div>
                )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* =====================================================
   STATUS
===================================================== */


function Offers({ api }) {
  const [offer, setOffer] = useState({
    enabled: false,
    title: "",
    message: "",
    buttonText: "",
    buttonUrl: ""
  });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refresh = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await api("/api/admin/offer");
      if (res?.offer) setOffer(res.offer);
    } catch (e) {
      setError(e?.message || "Unable to load offer.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const update = (key, value) => {
    setOffer((old) => ({ ...old, [key]: value }));
  };

  const saveOffer = async (data) => {
    try {
      setSaving(true);
      setError("");

      const res = await api("/api/admin/offer", {
        method: "PUT",
        body: JSON.stringify(data)
      });

      if (!res?.success) {
        throw new Error(res?.message || "Unable to save offer.");
      }

      setOffer(res.offer || data);
      alert(data.enabled ? "Offer published successfully." : "Offer turned OFF.");
    } catch (e) {
      setError(e?.message || "Unable to save offer.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="admin-panel">
      <div className="admin-panel-head">
        <div>
          <h2>Offers</h2>
          <p>Publish an offer that will appear to all users.</p>
        </div>
        <span className={offer.enabled ? "admin-status active" : "admin-status"}>
          {offer.enabled ? "LIVE" : "OFF"}
        </span>
      </div>

      {error && <div className="admin-error">{error}</div>}

      <div className="offer-form">
        <label>
          Offer Title
          <input
            value={offer.title}
            onChange={(e) => update("title", e.target.value)}
            placeholder="Special Offer"
          />
        </label>

        <label>
          Offer Message
          <textarea
            value={offer.message}
            onChange={(e) => update("message", e.target.value)}
            placeholder="Your offer message will appear here."
            rows="5"
          />
        </label>

        <label>
          Button Text
          <input
            value={offer.buttonText}
            onChange={(e) => update("buttonText", e.target.value)}
            placeholder="Claim Offer"
          />
        </label>

        <label>
          Button URL
          <input
            value={offer.buttonUrl}
            onChange={(e) => update("buttonUrl", e.target.value)}
            placeholder="https://tradenex.onrender.com/"
          />
        </label>

        <div className="offer-actions">
          <button
            className="small-button"
            disabled={saving || loading}
            onClick={() => saveOffer({ ...offer, enabled: true })}
          >
            {saving ? "Saving..." : "Publish Offer"}
          </button>

          <button
            className="toggle"
            disabled={saving || loading}
            onClick={() => saveOffer({ ...offer, enabled: false })}
          >
            OFF Offer
          </button>

          <button
            className="small-button"
            disabled={saving}
            onClick={refresh}
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="offer-preview-box">
        <div className="offer-preview-badge">PREVIEW</div>
        <h2>{offer.title || "Your Offer Title"}</h2>
        <p>{offer.message || "Your offer message will appear here."}</p>

        {offer.buttonText && (
          <button className="small-button">
            {offer.buttonText}
          </button>
        )}
      </div>
    </div>
  );
}

function Status({ status }) {
  return (
    <span
      className={`admin-status ${String(
        status || ""
      ).toLowerCase()}`}
    >
      {status || "-"}
    </span>
  );
}

/* =====================================================
   PAGE TITLE
===================================================== */

function playTradenexAdminNotificationSound() {
  try {
    const AudioCtx =
      window.AudioContext ||
      window.webkitAudioContext;

    if (!AudioCtx) return;

    const ctx = new AudioCtx();

    const tone = (frequency, start, duration) => {
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();

      oscillator.type = "sine";
      oscillator.frequency.value = frequency;

      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(
        0.18,
        start + 0.02
      );
      gain.gain.exponentialRampToValueAtTime(
        0.0001,
        start + duration
      );

      oscillator.connect(gain);
      gain.connect(ctx.destination);

      oscillator.start(start);
      oscillator.stop(start + duration);
    };

    const startSound = () => {
      const now = ctx.currentTime;

      tone(880, now, 0.16);
      tone(1174, now + 0.13, 0.22);
    };

    if (ctx.state === "suspended") {
      ctx.resume().then(startSound).catch(() => {});
    } else {
      startSound();
    }

    setTimeout(() => {
      try {
        ctx.close();
      } catch {}
    }, 1000);
  } catch (error) {
    console.log(
      "Admin notification sound skipped:",
      error
    );
  }
}

function adminTitle(page) {
  const titles = {
    dashboard: "Dashboard",
    users: "Users",
    deposits: "Deposits",
    withdrawals: "Withdrawals",
    rewards: "Referral Rewards",
    transactions: "Transactions",
    support: "Support",
  };

  return (
    titles[page] ||
    "Dashboard"
  );
}

export default App;

/* =====================================================
   OFFERS MANAGER
===================================================== */

function OfferManager() {
  const API = "https://tradenex-api.onrender.com/api";

  const [offer, setOffer] = useState({
    enabled: false,
    title: "",
    message: "",
    buttonText: "",
    buttonUrl: ""
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const r = await fetch(`${API}/offer?t=${Date.now()}`, {
          cache: "no-store"
        });
        const result = await r.json();

        if (result?.success && result?.offer) {
          setOffer({
            enabled: Boolean(result.offer.enabled),
            title: result.offer.title || "",
            message: result.offer.message || "",
            buttonText: result.offer.buttonText || "",
            buttonUrl: result.offer.buttonUrl || ""
          });
        }
      } catch (e) {
        setNotice("Unable to load offer.");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  async function saveOffer(e) {
    e.preventDefault();
    setSaving(true);
    setNotice("");

    try {
      const r = await fetch(`${API}/admin/offer`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(offer)
      });

      const result = await r.json();

      if (!r.ok || !result.success) {
        throw new Error(result.message || "Save failed");
      }

      setOffer({
        enabled: Boolean(result.offer?.enabled ?? offer.enabled),
        title: result.offer?.title ?? offer.title,
        message: result.offer?.message ?? offer.message,
        buttonText: result.offer?.buttonText ?? offer.buttonText,
        buttonUrl: result.offer?.buttonUrl ?? offer.buttonUrl
      });

      setNotice("✅ Offer saved successfully. All users will see it.");
    } catch (e) {
      setNotice("❌ " + (e.message || "Unable to save offer."));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="admin-panel">
        <h2>Loading Offers...</h2>
      </div>
    );
  }

  return (
    <div className="admin-panel offer-manager">
      <div className="admin-panel-head">
        <div>
          <h2>🎁 Offers</h2>
          <p>Publish an offer popup for all users.</p>
        </div>

        <label className="offer-toggle">
          <input
            type="checkbox"
            checked={offer.enabled}
            onChange={(e) =>
              setOffer({ ...offer, enabled: e.target.checked })
            }
          />
          <span>{offer.enabled ? "LIVE" : "OFF"}</span>
        </label>
      </div>

      <form onSubmit={saveOffer} className="offer-form">
        <label>
          Offer Title
          <input
            value={offer.title}
            onChange={(e) =>
              setOffer({ ...offer, title: e.target.value })
            }
            placeholder="Special Offer"
            maxLength={120}
          />
        </label>

        <label>
          Offer Message
          <textarea
            value={offer.message}
            onChange={(e) =>
              setOffer({ ...offer, message: e.target.value })
            }
            placeholder="Enter your offer message..."
            rows={6}
            maxLength={1000}
          />
        </label>

        <div className="offer-two-col">
          <label>
            Button Text
            <input
              value={offer.buttonText}
              onChange={(e) =>
                setOffer({ ...offer, buttonText: e.target.value })
              }
              placeholder="View Offer"
              maxLength={50}
            />
          </label>

          <label>
            Button URL
            <input
              value={offer.buttonUrl}
              onChange={(e) =>
                setOffer({ ...offer, buttonUrl: e.target.value })
              }
              placeholder="https://..."
              maxLength={500}
            />
          </label>
        </div>

        <div className="offer-preview">
          <div className="offer-preview-title">Preview</div>
          <div className="offer-preview-card">
            <div className="offer-preview-icon">🎁</div>
            <h3>{offer.title || "Special Offer"}</h3>
            <p>
              {offer.message ||
                "Your offer message will appear here."}
            </p>
            <button type="button">
              {offer.buttonText || "View Offer"}
            </button>
          </div>
        </div>

        <button
          type="submit"
          className="admin-primary-btn"
          disabled={saving}
        >
          {saving ? "Saving..." : "Save & Publish Offer"}
        </button>

        {notice && (
          <div className="offer-notice">
            {notice}
          </div>
        )}
      </form>
    </div>
  );
}
