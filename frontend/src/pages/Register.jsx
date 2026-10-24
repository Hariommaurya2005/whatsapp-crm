import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

const validate = (form) => {
  const errors = {};
  if (!form.name.trim()) errors.name = 'Name is required';
  else if (form.name.trim().length < 2) errors.name = 'Name must be at least 2 characters';

  if (!form.email) errors.email = 'Email is required';
  else if (!/^\S+@\S+\.\S+$/.test(form.email)) errors.email = 'Enter a valid email';

  if (!form.password) errors.password = 'Password is required';
  else if (form.password.length < 8) errors.password = 'Password must be at least 8 characters';
  else if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(form.password))
    errors.password = 'Must include uppercase, lowercase, and a number';

  if (form.password !== form.confirmPassword) errors.confirmPassword = 'Passwords do not match';

  return errors;
};

const PasswordStrength = ({ password }) => {
  if (!password) return null;
  let strength = 0;
  if (password.length >= 8) strength++;
  if (/[A-Z]/.test(password)) strength++;
  if (/[0-9]/.test(password)) strength++;
  if (/[^A-Za-z0-9]/.test(password)) strength++;

  const labels = ['Weak', 'Fair', 'Good', 'Strong'];
  const colors = ['#ef4444', '#f59e0b', '#3b82f6', '#22c55e'];

  return (
    <div style={{ marginTop: '6px' }}>
      <div style={{ display: 'flex', gap: '4px' }}>
        {[0,1,2,3].map((i) => (
          <div key={i} style={{
            flex: 1, height: '4px', borderRadius: '2px',
            backgroundColor: i < strength ? colors[strength - 1] : '#333',
            transition: 'background-color 0.3s',
          }} />
        ))}
      </div>
      <span style={{ fontSize: '12px', color: colors[strength - 1] || '#888', marginTop: '4px', display: 'block' }}>
        {password.length > 0 ? labels[strength - 1] || 'Too weak' : ''}
      </span>
    </div>
  );
};

const Register = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
    if (errors[name]) setErrors((p) => ({ ...p, [name]: '' }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationErrors = validate(form);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setLoading(true);
    try {
      const { data } = await api.post('/auth/register', {
        name: form.name,
        email: form.email,
        password: form.password,
      });
      login(data.data);
      toast.success('Account created! Welcome to WhatsApp CRM.');
      navigate('/dashboard');
    } catch (err) {
      const msg = err.response?.data?.message || 'Registration failed';
      toast.error(msg);
      if (err.response?.status === 409) {
        setErrors({ email: 'This email is already registered' });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-logo">
          <div className="auth-logo-icon">📱</div>
          <h1>Create Account</h1>
          <p>Join your team's CRM</p>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          {[
            { label: 'Full Name', name: 'name', type: 'text', placeholder: 'John Doe', autocomplete: 'name' },
            { label: 'Email', name: 'email', type: 'email', placeholder: 'you@example.com', autocomplete: 'email' },
          ].map(({ label, name, type, placeholder, autocomplete }) => (
            <div className="form-group" key={name}>
              <label className="form-label">{label}</label>
              <input
                className={`form-control ${errors[name] ? 'input-error' : ''}`}
                type={type}
                name={name}
                value={form[name]}
                onChange={handleChange}
                placeholder={placeholder}
                autoComplete={autocomplete}
              />
              {errors[name] && <span className="field-error">{errors[name]}</span>}
            </div>
          ))}

          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              className={`form-control ${errors.password ? 'input-error' : ''}`}
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              placeholder="Min 8 chars, uppercase + number"
              autoComplete="new-password"
            />
            <PasswordStrength password={form.password} />
            {errors.password && <span className="field-error">{errors.password}</span>}
          </div>

          <div className="form-group">
            <label className="form-label">Confirm Password</label>
            <input
              className={`form-control ${errors.confirmPassword ? 'input-error' : ''}`}
              type="password"
              name="confirmPassword"
              value={form.confirmPassword}
              onChange={handleChange}
              placeholder="Repeat your password"
              autoComplete="new-password"
            />
            {errors.confirmPassword && <span className="field-error">{errors.confirmPassword}</span>}
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{ width: '100%', justifyContent: 'center', marginTop: '8px', padding: '12px' }}
          >
            {loading ? <span className="spinner" /> : 'Create Account'}
          </button>
        </form>

        <div className="auth-footer">
          Already have an account?{' '}
          <Link to="/login">Sign in</Link>
        </div>
      </div>
    </div>
  );
};

export default Register;
