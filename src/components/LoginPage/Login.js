import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Swal from 'sweetalert2';
import queryString from 'query-string';
import { REACT_BASE_URL } from '../config';
import './login.css';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setConfirmShowPassword] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = queryString.parse(location.search);
  const resetToken = queryParams.token;
  const isResetPasswordMode = Boolean(resetToken);

  const handleLogin = async (e) => {
    e.preventDefault();

    const url = `${REACT_BASE_URL}/users/login`;

    const formData = new URLSearchParams();
    formData.append('grant_type', 'password');
    formData.append('username', email);
    formData.append('password', password);
    formData.append('scope', '');
    formData.append('client_id', 'string');
    formData.append('client_secret', 'string');

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData,
      });

      const data = await response.json();

      console.log('Login response status:', response.status);
      console.log('Login response data:', data);

      if (!response.ok) {
        Swal.fire({
          icon: 'error',
          title: 'Login Failed',
          text: data.detail || response.statusText,
        });
        return;
      }

      // Check if we have access_token
      if (!data.access_token) {
        console.error('No access_token in response:', data);
        Swal.fire({
          icon: 'error',
          title: 'Login Error',
          text: 'No access token received from server',
        });
        return;
      }

      localStorage.setItem('access_token', data.access_token);
      sessionStorage.setItem('access_token', data.access_token);
      console.log('Access token saved');

      if (data.refresh_token) {
        localStorage.setItem('refresh_token', data.refresh_token);
        sessionStorage.setItem('refresh_token', data.refresh_token);
      }

      if (data.role) {
        localStorage.setItem('user_role', data.role);
        sessionStorage.setItem('user_role', data.role);
      }

      if (data.full_name) {
        localStorage.setItem('user_full_name', data.full_name);
        sessionStorage.setItem('user_full_name', data.full_name);
      }

      // Store permissions for role-based UI control
      if (data.permissions) {
        const permsString = JSON.stringify(data.permissions);
        localStorage.setItem('user_permissions', permsString);
        sessionStorage.setItem('user_permissions', permsString);
      }

      Swal.fire({
        icon: 'success',
        title: 'Login Successful',
        showConfirmButton: false,
        timer: 1500,
      }).then(() => {
        navigate('/dashboard');
      });
    } catch (error) {
      console.error('Login error:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'An error occurred during login.',
      });
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    if (!email) {
      Swal.fire({
        icon: 'warning',
        title: 'Email Required',
        text: 'Please enter your email address.',
      });
      return;
    }

    try {
      const response = await fetch(
        `${REACT_BASE_URL}/users/forgot-password?email=${encodeURIComponent(email)}`,
        {
          method: 'POST',
          headers: {
            accept: 'application/json',
          },
        }
      );

      const data = await response.json();

      if (response.ok) {
        Swal.fire({
          icon: 'success',
          title: 'Reset Link Sent',
          text: 'Password reset link sent to your email.',
        }).then(() => {
          setIsForgotPassword(false);
        });
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: data.detail || 'Failed to send reset link.',
        });
      }
    } catch (error) {
      console.error('Forgot password error:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Something went wrong. Please try again later.',
      });
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      Swal.fire({
        icon: 'warning',
        title: 'Passwords do not match',
        text: 'Please make sure both passwords are the same.',
      });
      return;
    }

    try {
      const response = await fetch(`${REACT_BASE_URL}/users/reset-password`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: resetToken,
          new_password: newPassword,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        Swal.fire({
          icon: 'success',
          title: 'Success',
          text: data.message || 'Password reset successful!',
        }).then(() => {
          navigate('/');
        });
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Reset Failed',
          text: data.message || 'Failed to reset password.',
        });
      }
    } catch (error) {
      console.error('Reset password error:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Something went wrong. Please try again later.',
      });
    }
  };

  return (
    <div className="ams-container">
      <div className="ams-left-section">
        <img src="/amiand-logo.svg" alt="Amiand Logo" className="ams-logo" />
        <h1 className="ams-title">Asset Management System</h1>
        <img src="/illustration.svg" alt="Illustration" className="ams-illustration" />
      </div>

      <div className="ams-right-section">
        {isResetPasswordMode ? (
          <div className="ams-forgot-password-form">
            <h2 className="ams-form-title">Reset Password</h2>
            <p className="ams-form-text">Enter new password below:</p>
            <form onSubmit={handleResetPassword}>
              <div className="ams-input-wrapper ams-change-password">
                <span className="ams-input-icon">
                  <img src="/lock.svg" alt="Lock Icon" />
                </span>
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  placeholder="Enter your new password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="ams-form-input"
                  required
                />
                <span className="ams-eye-icon" onClick={() => setShowNewPassword(!showNewPassword)}>
                  <img
                    src={showNewPassword ? '/lockeye.svg' : '/openeye.svg'}
                    alt={showNewPassword ? 'Hide Password' : 'Show Password'}
                    style={{ cursor: 'pointer' }}
                  />
                </span>
              </div>

              <div className="ams-input-wrapper ams-change-password">
                <span className="ams-input-icon">
                  <img src="/lock.svg" alt="Lock Icon" />
                </span>
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Confirm your new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="ams-form-input"
                  required
                />
                <span className="ams-eye-icon" onClick={() => setConfirmShowPassword(!showConfirmPassword)}>
                  <img
                    src={showConfirmPassword ? '/lockeye.svg' : '/openeye.svg'}
                    alt={showConfirmPassword ? 'Hide Password' : 'Show Password'}
                    style={{ cursor: 'pointer' }}
                  />
                </span>
              </div>

              <button type="submit" className="ams-forget-submit-btn ams-login-button">Submit</button>
            </form>
          </div>
        ) : isForgotPassword ? (
          <div className="ams-forgot-password-form">
            <div className="ams-icon-wrapper">
              <img src="/alert_forget_pass.svg" alt="Warning Icon" style={{ width: '60px' }} />
            </div>
            <h2 className="ams-form-title">Forgot Password?</h2>
            <p className="ams-form-text">Enter your email and we'll send you a link to reset your password</p>
            <form onSubmit={handleForgotPassword}>
              <div className="ams-input-wrapper">
                <span className="ams-input-icon">
                  <img src="/email.svg" alt="Email Icon" />
                </span>
                <input
                  type="email"
                  placeholder="Enter your email id here"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="ams-form-input"
                  required
                />
              </div>
              <button type="submit" className="ams-forget-submit-btn ams-login-button">Submit</button>
            </form>
            <div className="ams-back-to-login">
              <span onClick={() => setIsForgotPassword(false)} style={{ cursor: 'pointer', color: '#15479E' }}>
                <img src="/backtologin.svg" alt="Back To Icon" /><p>Back to Login</p>
              </span>
            </div>
          </div>
        ) : (
          <>
            <h2 className="ams-login-title">Login</h2>
            <div className="ams-login-card">
              <form onSubmit={handleLogin} className="ams-login-form">
                <div className="ams-form-group">
                  <label className="ams-form-label">Email ID:</label>
                  <div className="ams-input-wrapper">
                    <span className="ams-input-icon">
                      <img src="/email.svg" alt="Email Icon" />
                    </span>
                    <input
                      type="email"
                      placeholder="Enter your email id here"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="ams-form-input"
                      required
                    />
                  </div>
                </div>

                <div className="ams-form-group">
                  <label className="ams-form-label">Password:</label>
                  <div className="ams-input-wrapper">
                    <span className="ams-input-icon">
                      <img src="/lock.svg" alt="Lock Icon" />
                    </span>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter your password here"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="ams-form-input"
                      required
                    />
                    <span className="ams-eye-icon" onClick={() => setShowPassword(!showPassword)}>
                      <img
                        src={showPassword ? '/lockeye.svg' : '/openeye.svg'}
                        alt={showPassword ? 'Hide Password' : 'Show Password'}
                        style={{ cursor: 'pointer' }}
                      />
                    </span>
                  </div>
                </div>

                <div className="ams-form-options">
                  <label className="ams-remember-me">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                    />
                    <span>Remember Me</span>
                  </label>
                  <span
                    className="ams-forgot-password"
                    onClick={() => setIsForgotPassword(true)}
                    style={{ cursor: 'pointer', color: '#15479E' }}
                  >
                    Forgot Password?
                  </span>
                </div>

                <button type="submit" className="ams-login-button">Login</button>
              </form>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Login;
