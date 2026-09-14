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

  const [selectedUser, setSelectedUser] = useState(null);
  const [userModal, setUserModal] = useState("");
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
    if (logged) {
      loadAdminData();
    }
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

          <div className="admin-user">
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

          {page === "support" && (
            <Support tickets={support} />
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
  openUserPassword,
  openUserBalance,
  toggleUserStatus,
  deleteUser,
}) {
  return (
    <div className="admin-panel">
      <div className="admin-panel-head">
        <h3>All Users</h3>
        <span>{users.length} users</span>
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
                      {d.status ===
                      "Pending" ? (
                        <div className="actions">
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
  const eligible = users.filter(
    (u) =>
      (u.referrals || [])
        .length >= 3
  );

  const totalRewards =
    users.reduce(
      (sum, u) =>
        sum +
        Number(
          u.referralReward || 0
        ),
      0
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
          Users with 3 or more
          successful referrals can
          withdraw their referral
          reward.
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
          title="Total Reward Balance"
          value={money(totalRewards)}
        />
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
                <th>Reward</th>
                <th>Eligibility</th>
              </tr>
            </thead>

            <tbody>
              {users.map((u) => {
                const count =
                  (
                    u.referrals ||
                    []
                  ).length;

                const ok =
                  count >= 3;

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
                        {u.referralCode ||
                          "-"}
                      </span>
                    </td>

                    <td>{count}</td>

                    <td>
                      {money(
                        u.referralReward
                      )}
                    </td>

                    <td>
                      {ok ? (
                        <span className="reward-ok">
                          ✓ Eligible
                        </span>
                      ) : (
                        <span className="reward-lock">
                          🔒 {3 - count} more
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

function Support({ tickets }) {
  const [items, setItems] = useState(tickets || []);
  const [selected, setSelected] = useState(null);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

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