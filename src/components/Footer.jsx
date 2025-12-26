import React from "react";

const Footer = ({
  variant = "default",
  company = "Acme Corp Business Suite",
}) => {
  const currentYear = new Date().getFullYear();

  // Variant 1: Default footer (used in Home)
  if (variant === "default") {
    return (
      <footer className="mt-auto w-full text-center py-6 text-sm text-[#617589] border-t border-[#dbe0e6] bg-white">
        <div className="flex flex-col md:flex-row items-center justify-center gap-4">
          <p>
            {currentYear} {company}. All rights reserved.
          </p>
        </div>
      </footer>
    );
  }

  // Variant 2: Admin console footer
  if (variant === "admin") {
    return (
      <div className="mt-12 pt-6 border-t border-gray-200">
        <div className="flex items-center justify-between text-sm text-gray-600">
          <p>&copy; {currentYear} Admin Console. All rights reserved.</p>
          <div className="flex gap-6">
            <a
              href="#"
              className="hover:text-gray-900 transition-colors"
            >
              Support
            </a>
            <a
              href="#"
              className="hover:text-gray-900 transition-colors"
            >
              Privacy Policy
            </a>
            <a
              href="#"
              className="hover:text-gray-900 transition-colors"
            >
              Terms of Service
            </a>
          </div>
        </div>
      </div>
    );
  }

  // Variant 3: Minimal footer
  if (variant === "minimal") {
    return (
      <footer className="py-4 text-center text-xs text-gray-500 border-t border-gray-200">
        <p>
          &copy; {currentYear} {company}. All rights reserved.
        </p>
      </footer>
    );
  }

  return null;
};

export default Footer;
