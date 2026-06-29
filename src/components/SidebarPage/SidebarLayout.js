import React, { useState, useEffect } from "react";
import { Drawer } from "antd";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { jwtDecode } from "jwt-decode";
import "./SidebarLayout.css";
import AssetManagement from "../AssetManagementPage/AssetManagement";
import OtherAssetManagement from "../AssetManagementPage/OtherAssetManagement";
import EmployeesManagement from "../EmployeesPage/EmployeesManagement";
import TicketsManagement from "../TicketsPage/TicketsManagement";
import Dashboard from "../Dashboard/Dashboard";
import UserManagement from "../AdminPage/UserManagement";
import AdminRequestsPage from "../AdminRequestsPage/AdminRequestsPage";
import StockManagement from "../StockManagement/StockManagement";
import InvoiceManagement from "../InvoiceManagement/InvoiceManagement";
import { REACT_BASE_URL } from "../config";

const menuItems = [
  { key: "dashboard", label: "Dashboard", icon: "/Dashboard_icon.svg" },
  { key: "asset", label: "Asset Management", icon: "/Asset_Management_icon.svg" },
  { key: "other-assets", label: "Other Asset Management", icon: "/icons/stock.svg" },
  { key: "stock", label: "Stock Management", icon: "/icons/stock.svg" },
  { key: "invoices", label: "Invoices", icon: "/icons/invoice.svg" },
  { key: "employees", label: "Employees", icon: "/Employees_icon.svg" },
  { key: "tickets", label: "Tickets", icon: "/icons/ticket.svg" },
  { key: "admin", label: "User Management", icon: "/Employees_icon.svg", role: "Super Admin" },
  { key: "admin-requests", label: "All Requests", icon: "/icons/request.svg", role: "Super Admin" },
];

const SidebarLayout = ({ children }) => {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [countdown, setCountdown] = useState("");
  const [hasShownWarning, setHasShownWarning] = useState(false);
  const navigate = useNavigate();

  const userFullName =
    localStorage.getItem("user_full_name") ||
    sessionStorage.getItem("user_full_name") ||
    "Unknown User";
  const userRole =
    localStorage.getItem("user_role") ||
    sessionStorage.getItem("user_role") ||
    "Unknown Role";

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);
  const toggleCollapse = () => setCollapsed(!collapsed);

  const handleMenuClick = (key) => {
    setActiveTab(key);
    if (window.innerWidth <= 767) setSidebarOpen(false);
  };

  const refreshToken = async () => {
    const refreshTokenValue =
      localStorage.getItem("refresh_token") ||
      sessionStorage.getItem("refresh_token");

    try {
      const response = await fetch(`${REACT_BASE_URL}/users/refresh-token`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ refresh_token: refreshTokenValue }),
      });

      if (!response.ok) {
        throw new Error("Failed to refresh token");
      }

      const data = await response.json();

      if (localStorage.getItem("access_token")) {
        localStorage.setItem("access_token", data.access_token);
      } else {
        sessionStorage.setItem("access_token", data.access_token);
      }

      setHasShownWarning(false);

      Swal.fire({
        icon: "success",
        title: "Session Extended",
        text: "Your session has been successfully extended.",
        timer: 2000,
        showConfirmButton: false,
      });

      return true;
    } catch (error) {
      console.error("Token refresh error:", error);
      Swal.fire({
        icon: "error",
        title: "Session Refresh Failed",
        text: "Unable to extend your session. You will be logged out.",
        timer: 2000,
        showConfirmButton: false,
      });
      return false;
    }
  };

  const showSessionExpiryWarning = () => {
    Swal.fire({
      title: "Session Expiring Soon",
      text: "Your session will expire in less than a minute. Would you like to continue?",
      icon: "warning",
      showDenyButton: true,
      showCancelButton: false,
      confirmButtonText: "Continue Session",
      denyButtonText: "Logout",
      allowOutsideClick: false,
      allowEscapeKey: false,
    }).then(async (result) => {
      if (result.isConfirmed) {
        const refreshSuccess = await refreshToken();
        if (!refreshSuccess) {
          handleLogout();
        }
      } else if (result.isDenied) {
        Swal.fire({
          icon: "info",
          title: "Logging Out",
          text: "You have been logged out.",
          timer: 1500,
          showConfirmButton: false,
        }).then(() => handleLogout());
      }
    });
  };

  const confirmLogout = () => {
    Swal.fire({
      title: "Logout",
      text: "Are you sure you want to logout?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, logout",
      cancelButtonText: "Cancel",
      allowOutsideClick: false,
      allowEscapeKey: false,
    }).then((result) => {
      if (result.isConfirmed) {
        handleLogout();
      }
    });
  };

  const handleLogout = async () => {
    const refreshTokenValue =
      localStorage.getItem("refresh_token") ||
      sessionStorage.getItem("refresh_token");

    try {
      await fetch(`${REACT_BASE_URL}/users/logout`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ refresh_token: refreshTokenValue }),
      });
    } catch (error) {
      console.error("Logout API error:", error);
    }

    localStorage.clear();
    sessionStorage.clear();

    Swal.fire({
      icon: "success",
      title: "Logged Out",
      text: "You have been logged out.",
      timer: 1500,
      showConfirmButton: false,
    }).then(() => navigate("/"));
  };

  useEffect(() => {
    const accessToken =
      localStorage.getItem("access_token") ||
      sessionStorage.getItem("access_token");
    const refreshTokenValue =
      localStorage.getItem("refresh_token") ||
      sessionStorage.getItem("refresh_token");

    if (!accessToken || !refreshTokenValue) return;

    try {
      const decoded = jwtDecode(accessToken);
      const expTime = decoded.exp * 1000;

      const updateCountdown = () => {
        const now = Date.now();
        const remaining = expTime - now;

        if (remaining <= 0) {
          setCountdown("00:00");
          handleLogout();
          return;
        }

        if (remaining <= 60000 && !hasShownWarning) {
          setHasShownWarning(true);
          showSessionExpiryWarning();
        }

        const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((remaining % (1000 * 60)) / 1000);

        setCountdown(
          `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
        );
      };

      updateCountdown();
      const interval = setInterval(updateCountdown, 1000);

      return () => clearInterval(interval);
    } catch (err) {
      console.error("Token decode failed:", err);
      handleLogout();
    }
  }, [hasShownWarning]);

  const SidebarContent = ({ isMobile = false }) => (
    <div className={`sidebar-content ${collapsed && !isMobile ? "collapsed" : ""}`}>
      <div className="logo-container">
        {(!collapsed || isMobile) && (
          <img src="/amiand-logo.svg" alt="Logo" className="logo-img" />
        )}
        {!isMobile && (
          <button className="collapse-btn" onClick={toggleCollapse}>
            <img
              src="/above_back.svg"
              alt="Collapse"
              className={`collapse-icon ${collapsed ? "rotated" : ""}`}
            />
          </button>
        )}
      </div>

      <div className="separator"></div>

      <ul className="menu-list">
        {menuItems.map((item) => (
          <li
            key={item.key}
            onClick={() => handleMenuClick(item.key)}
            className={`menu-item ${activeTab === item.key ? "active" : ""} ${collapsed && !isMobile ? "collapsed-item" : ""
              } ${item.role && userRole !== item.role ? "hidden-menu-item" : ""}`}
            title={collapsed && !isMobile ? item.label : ""}
            style={{ display: item.role && userRole !== item.role ? "none" : "flex" }}
          >
            <img
              src={item.icon}
              alt={`${item.label} icon`}
              className={`menu-icon-left ${activeTab === item.key ? "white-icon" : ""}`}
            />
            {(!collapsed || isMobile) && (
              <span className="menu-label">{item.label}</span>
            )}
          </li>
        ))}
      </ul>

      <div className={`user-box ${collapsed && !isMobile ? "collapsed-user" : ""}`}>
        <div className="user-initials">
          {userFullName
            .split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase()}
        </div>
        {(!collapsed || isMobile) && (
          <>
            <div className="user-details">
              <div className="user-name">
                {userFullName}
              </div>
              <div className="user-email">{userRole}</div>
            </div>
            <img
              src="/logout_back.svg"
              alt="Logout"
              className="logout-icon"
              onClick={confirmLogout}
              style={{ cursor: "pointer" }}
            />
          </>
        )}
      </div>
    </div>
  );

  return (
    <div className="layout-container">
      <button className="mobile-menu-btn" onClick={toggleSidebar}>
        <img src="/above_back.svg" alt="Menu" />
      </button>

      <div className={`desktop-sidebar ${collapsed ? "collapsed" : ""}`}>
        <SidebarContent />
      </div>

      <Drawer
        title={null}
        placement="left"
        onClose={toggleSidebar}
        open={sidebarOpen}
        bodyStyle={{ padding: 0 }}
        headerStyle={{ display: "none" }}
        width="85vw"
        className="mobile-drawer"
        maskClosible={true}
      >
        <SidebarContent isMobile={true} />
      </Drawer>

      <div className={`main-content ${collapsed ? "collapsed-content" : ""}`}>
        {activeTab === "dashboard" ? (
          <Dashboard />
        ) : activeTab === "asset" ? (
          <AssetManagement isOtherAssetPage={false} />
        ) : activeTab === "other-assets" ? (
          <OtherAssetManagement />
        ) : activeTab === "stock" ? (
          <StockManagement />
        ) : activeTab === "invoices" ? (
          <InvoiceManagement />
        ) : activeTab === "employees" ? (
          <EmployeesManagement />
        ) : activeTab === "tickets" ? (
          <TicketsManagement />
        ) : activeTab === "admin" ? (
          <UserManagement />
        ) : activeTab === "admin-requests" ? (
          <AdminRequestsPage />
        ) : (
          children || <div>Select a tab to view content</div>
        )}
      </div>
    </div>
  );
};

export default SidebarLayout;