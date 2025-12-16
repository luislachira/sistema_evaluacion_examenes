import React from 'react';

const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="footer-content">
        <p className="footer-text">
          © {currentYear} I.E. Leonor Cerna de Valdiviezo. Todos los derechos reservados.
        </p>
      </div>
    </footer>
  );
};

export default Footer;

