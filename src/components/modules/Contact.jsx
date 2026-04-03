import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from "react";
import toast from "react-hot-toast";
import Breadcrumb from "../Breadcrumb";
import Pagination from "../Pagination";
import ModuleLoader from "../common/ModuleLoader";
import DataTable from "../common/DataTable";
import { apiService } from "../../services/api";

const createEmptyContactForm = () => ({
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  alternatePhone: "",
  company: "",
  jobTitle: "",
  department: "",
  dateOfBirth: "",
  address: "",
  city: "",
  state: "",
  zipCode: "",
  country: "",
  website: "",
  category: "Other",
  status: "Active",
  preferredContactMethod: "Email",
  notes: "",
  profilePicture: null,
  documents: [],
  socialMedia: {
    linkedin: "",
    twitter: "",
    facebook: "",
  },
});

// ==================== ADD/EDIT CONTACT FORM ====================
const ContactModal = ({
  isOpen,
  contact,
  onClose,
  onSave,
  isLoading,
  variant = "modal",
}) => {
  const modalRef = useRef(null);
  const [formData, setFormData] = useState(createEmptyContactForm());

  useEffect(() => {
    if (contact) {
      setFormData({
        ...createEmptyContactForm(),
        ...contact,
        dateOfBirth: contact.dateOfBirth
          ? String(contact.dateOfBirth).slice(0, 10)
          : "",
        profilePicture: contact.profilePicture || null,
        documents: contact.documents || [],
        socialMedia: {
          ...createEmptyContactForm().socialMedia,
          ...(contact.socialMedia || {}),
        },
      });
    } else {
      setFormData(createEmptyContactForm());
    }
  }, [contact, isOpen]);

  const readFileAsDataUrl = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleDateChange = (e) => {
    const { value } = e.target;
    setFormData((prev) => ({
      ...prev,
      dateOfBirth: value,
    }));
  };

  const handleProfilePictureChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const data = await readFileAsDataUrl(file);
      setFormData((prev) => ({
        ...prev,
        profilePicture: {
          name: file.name,
          data,
          size: file.size,
          type: file.type,
          uploadedAt: new Date().toISOString(),
        },
      }));
    } catch (_error) {
      toast.error("Failed to load profile picture");
    }
  };

  const handleDocumentsChange = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    try {
      const uploads = await Promise.all(
        files.map(async (file) => ({
          name: file.name,
          data: await readFileAsDataUrl(file),
          size: file.size,
          type: file.type,
          uploadedAt: new Date().toISOString(),
        })),
      );

      setFormData((prev) => ({
        ...prev,
        documents: [...(prev.documents || []), ...uploads],
      }));
    } catch (_error) {
      toast.error("Failed to load documents");
    }
  };

  const removeDocument = (index) => {
    setFormData((prev) => ({
      ...prev,
      documents: (prev.documents || []).filter(
        (_, itemIndex) => itemIndex !== index,
      ),
    }));
  };

  const handleSocialMediaChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      socialMedia: {
        ...prev.socialMedia,
        [name]: value,
      },
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (
      !formData.firstName.trim() ||
      !formData.lastName.trim() ||
      !formData.email.trim() ||
      !formData.phone.trim()
    ) {
      toast.error("Please fill in all required fields");
      return;
    }
    onSave(formData);
  };

  if (!isOpen) return null;

  const isPage = variant === "page";

  return (
    <div
      className={
        isPage
          ? "w-full"
          : "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      }
    >
      <div
        ref={modalRef}
        className={`bg-white dark:bg-slate-800 rounded-xl shadow-lg w-full ${
          isPage ? "overflow-hidden" : "max-w-2xl max-h-[90vh] overflow-y-auto"
        }`}
      >
        <div className="sticky top-0 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            {contact ? "Edit Contact" : "Add New Contact"}
          </h2>
          {!isPage && (
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 text-2xl"
            >
              ×
            </button>
          )}
        </div>

        <form
          onSubmit={handleSubmit}
          className={isPage ? "p-2 space-y-4" : "p-6 space-y-4"}
        >
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                First Name *
              </label>
              <input
                type="text"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Last Name *
              </label>
              <input
                type="text"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                required
              />
            </div>
          </div>

          {/* Contact Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Email *
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Phone *
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Alternate Phone
              </label>
              <input
                type="tel"
                name="alternatePhone"
                value={formData.alternatePhone}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Company
              </label>
              <input
                type="text"
                name="company"
                value={formData.company}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>

          {/* Professional Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Job Title
              </label>
              <input
                type="text"
                name="jobTitle"
                value={formData.jobTitle}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Department
              </label>
              <input
                type="text"
                name="department"
                value={formData.department}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>

          {/* Address */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Address
            </label>
            <input
              type="text"
              name="address"
              value={formData.address}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                City
              </label>
              <input
                type="text"
                name="city"
                value={formData.city}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                State
              </label>
              <input
                type="text"
                name="state"
                value={formData.state}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Zip Code
              </label>
              <input
                type="text"
                name="zipCode"
                value={formData.zipCode}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Date of Birth
              </label>
              <input
                type="date"
                name="dateOfBirth"
                value={formData.dateOfBirth}
                onChange={handleDateChange}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Profile Picture
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={handleProfilePictureChange}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
              />
              {formData.profilePicture?.name && (
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                  Selected: {formData.profilePicture.name}
                </p>
              )}
            </div>
          </div>

          {/* Online Presence */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Website
              </label>
              <input
                type="url"
                name="website"
                value={formData.website}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="https://..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                LinkedIn
              </label>
              <input
                type="url"
                name="linkedin"
                value={formData.socialMedia.linkedin}
                onChange={handleSocialMediaChange}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="https://linkedin.com/in/..."
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Documents
            </label>
            <input
              type="file"
              multiple
              onChange={handleDocumentsChange}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
            />
            {!!formData.documents?.length && (
              <div className="mt-3 space-y-2">
                {formData.documents.map((document, index) => (
                  <div
                    key={`${document.name}-${index}`}
                    className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/30 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                        {document.name}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {(document.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeDocument(index)}
                      className="text-sm font-medium text-red-600 hover:text-red-700"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Category & Status */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Category
              </label>
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="Client">Client</option>
                <option value="Vendor">Vendor</option>
                <option value="Employee">Employee</option>
                <option value="Partner">Partner</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Status
              </label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
                <option value="Archived">Archived</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Preferred Contact Method
            </label>
            <select
              name="preferredContactMethod"
              value={formData.preferredContactMethod}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="Email">Email</option>
              <option value="Phone">Phone</option>
              <option value="SMS">SMS</option>
              <option value="LinkedIn">LinkedIn</option>
              <option value="Other">Other</option>
            </select>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Notes
            </label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows="3"
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="Add any additional notes..."
            />
          </div>

          {/* Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {isLoading ? "Saving..." : "Save Contact"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ==================== CONTACT DETAILS VIEW ====================
const ContactDetailsView = ({
  contact,
  onBack,
  onEdit,
  onDelete,
  isDeleting,
}) => {
  if (!contact) return null;

  return (
    <main className="flex-1 overflow-auto">
      <div className="w-full p-2">
        <div className="w-full">
          {/* Header */}
          <div className="flex justify-between items-start mb-6">
            <div className="flex items-start gap-4">
              {contact.profilePicture?.data && (
                <img
                  src={contact.profilePicture.data}
                  alt={`${contact.firstName} ${contact.lastName}`}
                  className="h-16 w-16 rounded-full object-cover border border-slate-200 dark:border-slate-700"
                />
              )}
              <div>
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
                  {contact.firstName} {contact.lastName}
                </h1>
                <p className="text-slate-600 dark:text-slate-400">
                  {contact.jobTitle || contact.category}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => onEdit(contact)}
                className="px-4 py-2 text-sm font-medium text-blue-600 border border-blue-300 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/30"
              >
                Edit
              </button>
              <button
                onClick={() => {
                  if (
                    window.confirm(
                      "Are you sure you want to delete this contact?",
                    )
                  ) {
                    onDelete(contact._id);
                  }
                }}
                disabled={isDeleting}
                className="px-4 py-2 text-sm font-medium text-red-600 border border-red-300 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30 disabled:opacity-50"
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </button>
              <button
                onClick={onBack}
                className="px-4 py-2 text-sm font-medium text-slate-600 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700"
              >
                Back
              </button>
            </div>
          </div>

          {/* Status & Category Badge */}
          <div className="flex gap-2 mb-6">
            <span
              className={`px-3 py-1 rounded-full text-sm font-medium ${
                contact.status === "Active"
                  ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                  : contact.status === "Inactive"
                    ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
                    : "bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-400"
              }`}
            >
              {contact.status}
            </span>
            <span className="px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
              {contact.category}
            </span>
          </div>

          {/* Grid of Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Contact Information */}
            <div className="bg-slate-50 dark:bg-slate-900/30 rounded-lg p-4">
              <h3 className="font-bold text-slate-900 dark:text-white mb-4">
                Contact Information
              </h3>
              <dl className="space-y-3 text-sm">
                <div>
                  <dt className="text-slate-600 dark:text-slate-400">Email</dt>
                  <dd className="text-slate-900 dark:text-white font-medium break-all">
                    {contact.email}
                  </dd>
                </div>
                {contact.dateOfBirth && (
                  <div>
                    <dt className="text-slate-600 dark:text-slate-400">
                      Date of Birth
                    </dt>
                    <dd className="text-slate-900 dark:text-white font-medium">
                      {new Date(contact.dateOfBirth).toLocaleDateString()}
                    </dd>
                  </div>
                )}
                <div>
                  <dt className="text-slate-600 dark:text-slate-400">Phone</dt>
                  <dd className="text-slate-900 dark:text-white font-medium">
                    {contact.phone}
                  </dd>
                </div>
                {contact.alternatePhone && (
                  <div>
                    <dt className="text-slate-600 dark:text-slate-400">
                      Alternate Phone
                    </dt>
                    <dd className="text-slate-900 dark:text-white font-medium">
                      {contact.alternatePhone}
                    </dd>
                  </div>
                )}
                {contact.website && (
                  <div>
                    <dt className="text-slate-600 dark:text-slate-400">
                      Website
                    </dt>
                    <dd className="text-blue-600 dark:text-blue-400 font-medium">
                      <a
                        href={contact.website}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {contact.website}
                      </a>
                    </dd>
                  </div>
                )}
              </dl>
            </div>

            {/* Professional Information */}
            <div className="bg-slate-50 dark:bg-slate-900/30 rounded-lg p-4">
              <h3 className="font-bold text-slate-900 dark:text-white mb-4">
                Professional Information
              </h3>
              <dl className="space-y-3 text-sm">
                {contact.company && (
                  <div>
                    <dt className="text-slate-600 dark:text-slate-400">
                      Company
                    </dt>
                    <dd className="text-slate-900 dark:text-white font-medium">
                      {contact.company}
                    </dd>
                  </div>
                )}
                {contact.jobTitle && (
                  <div>
                    <dt className="text-slate-600 dark:text-slate-400">
                      Job Title
                    </dt>
                    <dd className="text-slate-900 dark:text-white font-medium">
                      {contact.jobTitle}
                    </dd>
                  </div>
                )}
                {contact.department && (
                  <div>
                    <dt className="text-slate-600 dark:text-slate-400">
                      Department
                    </dt>
                    <dd className="text-slate-900 dark:text-white font-medium">
                      {contact.department}
                    </dd>
                  </div>
                )}
              </dl>
            </div>

            {/* Address */}
            {(contact.address || contact.city || contact.state) && (
              <div className="bg-slate-50 dark:bg-slate-900/30 rounded-lg p-4">
                <h3 className="font-bold text-slate-900 dark:text-white mb-4">
                  Address
                </h3>
                <dl className="space-y-3 text-sm">
                  {contact.address && (
                    <div>
                      <dt className="text-slate-600 dark:text-slate-400">
                        Street
                      </dt>
                      <dd className="text-slate-900 dark:text-white font-medium">
                        {contact.address}
                      </dd>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-3">
                    {contact.city && (
                      <div>
                        <dt className="text-slate-600 dark:text-slate-400">
                          City
                        </dt>
                        <dd className="text-slate-900 dark:text-white font-medium">
                          {contact.city}
                        </dd>
                      </div>
                    )}
                    {contact.state && (
                      <div>
                        <dt className="text-slate-600 dark:text-slate-400">
                          State
                        </dt>
                        <dd className="text-slate-900 dark:text-white font-medium">
                          {contact.state}
                        </dd>
                      </div>
                    )}
                  </div>
                  {contact.zipCode && (
                    <div>
                      <dt className="text-slate-600 dark:text-slate-400">
                        Zip Code
                      </dt>
                      <dd className="text-slate-900 dark:text-white font-medium">
                        {contact.zipCode}
                      </dd>
                    </div>
                  )}
                </dl>
              </div>
            )}

            {/* Social Media */}
            {(contact.socialMedia?.linkedin ||
              contact.socialMedia?.twitter ||
              contact.socialMedia?.facebook) && (
              <div className="bg-slate-50 dark:bg-slate-900/30 rounded-lg p-4">
                <h3 className="font-bold text-slate-900 dark:text-white mb-4">
                  Social Media
                </h3>
                <dl className="space-y-3 text-sm">
                  {contact.socialMedia?.linkedin && (
                    <div>
                      <dt className="text-slate-600 dark:text-slate-400">
                        LinkedIn
                      </dt>
                      <dd className="text-blue-600 dark:text-blue-400 font-medium">
                        <a
                          href={contact.socialMedia.linkedin}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Visit Profile
                        </a>
                      </dd>
                    </div>
                  )}
                  {contact.socialMedia?.twitter && (
                    <div>
                      <dt className="text-slate-600 dark:text-slate-400">
                        Twitter
                      </dt>
                      <dd className="text-blue-600 dark:text-blue-400 font-medium">
                        <a
                          href={contact.socialMedia.twitter}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Visit Profile
                        </a>
                      </dd>
                    </div>
                  )}
                  {contact.socialMedia?.facebook && (
                    <div>
                      <dt className="text-slate-600 dark:text-slate-400">
                        Facebook
                      </dt>
                      <dd className="text-blue-600 dark:text-blue-400 font-medium">
                        <a
                          href={contact.socialMedia.facebook}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Visit Profile
                        </a>
                      </dd>
                    </div>
                  )}
                </dl>
              </div>
            )}
          </div>

          {contact.documents?.length > 0 && (
            <div className="mt-6 bg-slate-50 dark:bg-slate-900/30 rounded-lg p-4">
              <h3 className="font-bold text-slate-900 dark:text-white mb-4">
                Documents
              </h3>
              <div className="space-y-2">
                {contact.documents.map((document, index) => (
                  <div
                    key={`${document.name}-${index}`}
                    className="flex items-center justify-between rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2"
                  >
                    <div>
                      <p className="text-sm font-medium text-slate-900 dark:text-white">
                        {document.name}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {(document.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                    <span className="text-xs text-slate-500 dark:text-slate-400 uppercase">
                      {document.type || "File"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          {contact.notes && (
            <div className="mt-6 bg-slate-50 dark:bg-slate-900/30 rounded-lg p-4">
              <h3 className="font-bold text-slate-900 dark:text-white mb-2">
                Notes
              </h3>
              <p className="text-slate-700 dark:text-slate-300 text-sm whitespace-pre-wrap">
                {contact.notes}
              </p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
};

// ==================== MAIN CONTACTS COMPONENT ====================
const Contact = () => {
  const [isEntering, setIsEntering] = useState(true);
  const [filteredContacts, setFilteredContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [showModal, setShowModal] = useState(false);
  const [showAddPage, setShowAddPage] = useState(false);
  const [editingContact, setEditingContact] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedContact, setSelectedContact] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // Entry animation
  useEffect(() => {
    setIsEntering(true);
    const timer = setTimeout(() => setIsEntering(false), 220);
    return () => clearTimeout(timer);
  }, []);

  const fetchContacts = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiService.get("/api/contacts", {
        params: {
          page: currentPage,
          limit: pageSize,
          search: searchQuery,
          category: categoryFilter,
          status: statusFilter,
        },
      });

      const data = response || {};
      setFilteredContacts(data.contacts || []);
      setTotalPages(data.pagination?.pages || 1);
    } catch (error) {
      console.error("Error fetching contacts:", error);
      toast.error("Failed to load contacts");
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, searchQuery, categoryFilter, statusFilter]);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  const handleAddContact = async (formData) => {
    try {
      setIsSaving(true);
      await apiService.post("/api/contacts", formData);
      toast.success("Contact created successfully");
      setShowAddPage(false);
      fetchContacts();
    } catch (error) {
      console.error("Error creating contact:", error);
      toast.error(error?.response?.data?.message || "Failed to create contact");
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateContact = async (formData) => {
    if (!editingContact?._id) return;
    try {
      setIsSaving(true);
      await apiService.put(`/api/contacts/${editingContact._id}`, formData);
      toast.success("Contact updated successfully");
      setShowModal(false);
      setEditingContact(null);
      fetchContacts();
    } catch (error) {
      console.error("Error updating contact:", error);
      toast.error(error?.response?.data?.message || "Failed to update contact");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteContact = async (contactId) => {
    try {
      setIsDeleting(true);
      await apiService.delete(`/api/contacts/${contactId}`);
      toast.success("Contact deleted successfully");
      setSelectedContact(null);
      fetchContacts();
    } catch (error) {
      console.error("Error deleting contact:", error);
      toast.error("Failed to delete contact");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEditContact = (contact) => {
    setEditingContact(contact);
    setShowModal(true);
  };

  const handleStartAddContact = () => {
    setEditingContact(null);
    setShowAddPage(true);
  };

  const columns = useMemo(
    () => [
      {
        header: "Name",
        accessor: "row",
        cell: (row) => (
          <div
            className="cursor-pointer hover:text-blue-600 dark:hover:text-blue-400"
            onClick={() => setSelectedContact(row)}
          >
            <p className="font-semibold text-slate-900 dark:text-white">
              {row.firstName} {row.lastName}
            </p>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {row.company || row.jobTitle}
            </p>
          </div>
        ),
      },
      {
        header: "Email",
        accessor: "email",
        cell: (value) => (
          <a
            href={`mailto:${value}`}
            className="text-blue-600 dark:text-blue-400 hover:underline text-sm"
          >
            {value}
          </a>
        ),
      },
      {
        header: "Phone",
        accessor: "phone",
        cell: (value) => (
          <a href={`tel:${value}`} className="text-slate-900 dark:text-white">
            {value}
          </a>
        ),
      },
      {
        header: "Category",
        accessor: "category",
        cell: (value) => (
          <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
            {value}
          </span>
        ),
      },
      {
        header: "Status",
        accessor: "status",
        cell: (value) => (
          <span
            className={`px-3 py-1 rounded-full text-xs font-medium ${
              value === "Active"
                ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                : value === "Inactive"
                  ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
                  : "bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-400"
            }`}
          >
            {value}
          </span>
        ),
      },
      {
        header: "Actions",
        accessor: "row",
        cell: (row) => (
          <div className="flex gap-2">
            <button
              onClick={() => handleEditContact(row)}
              className="text-blue-600 dark:text-blue-400 hover:underline text-sm"
            >
              Edit
            </button>
            <button
              onClick={() => setSelectedContact(row)}
              className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white text-sm"
            >
              View
            </button>
          </div>
        ),
      },
    ],
    [],
  );

  if (isEntering) {
    return <ModuleLoader moduleName="Contacts" />;
  }

  if (showAddPage) {
    return (
      <div className="w-full min-h-screen bg-gray-50 flex flex-col dark:bg-slate-900">
        <Breadcrumb
          items={[
            { label: "Home", href: "/home", icon: "fa-house" },
            {
              label: "Contacts",
              icon: "fa-address-book",
              onClick: () => setShowAddPage(false),
            },
            {
              label: "Add Contact",
              icon: "fa-plus",
            },
          ]}
        />

        <main className="flex-1 overflow-auto">
          <div className="w-full p-2">
            <div className="w-full">
              <ContactModal
                isOpen={showAddPage}
                variant="page"
                contact={null}
                onClose={() => setShowAddPage(false)}
                onSave={handleAddContact}
                isLoading={isSaving}
              />
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (selectedContact) {
    return (
      <div className="w-full min-h-screen bg-gray-50 flex flex-col dark:bg-slate-900">
        <Breadcrumb
          items={[
            { label: "Home", href: "/home", icon: "fa-house" },
            {
              label: "Contacts",
              icon: "fa-address-book",
              onClick: () => setSelectedContact(null),
            },
            {
              label: `${selectedContact.firstName} ${selectedContact.lastName}`,
              icon: "fa-user",
            },
          ]}
        />
        <ContactDetailsView
          contact={selectedContact}
          onBack={() => setSelectedContact(null)}
          onEdit={handleEditContact}
          onDelete={handleDeleteContact}
          isDeleting={isDeleting}
        />
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-gray-50 flex flex-col dark:bg-slate-900">
      <Breadcrumb
        items={[
          { label: "Home", href: "/home", icon: "fa-house" },
          { label: "Contacts", icon: "fa-address-book" },
        ]}
      />

      <main className="flex-1 overflow-auto">
        <div className="w-full p-2">
          <div className="w-full">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
              <div>
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
                  Contacts
                </h1>
                <p className="text-slate-600 dark:text-slate-400 mt-1">
                  Manage and organize your contacts
                </p>
              </div>
              <button
                onClick={handleStartAddContact}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
              >
                <i className="fa-solid fa-plus"></i>
                Add Contact
              </button>
            </div>

            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <input
                type="text"
                placeholder="Search by name, email, or company..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
              />

              <select
                value={categoryFilter}
                onChange={(e) => {
                  setCategoryFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="">All Categories</option>
                <option value="Client">Client</option>
                <option value="Vendor">Vendor</option>
                <option value="Employee">Employee</option>
                <option value="Partner">Partner</option>
                <option value="Other">Other</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="">All Statuses</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
                <option value="Archived">Archived</option>
              </select>

              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value={10}>10 per page</option>
                <option value={20}>20 per page</option>
                <option value={50}>50 per page</option>
                <option value={100}>100 per page</option>
              </select>
            </div>

            {/* Contacts Table */}
            {loading ? (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
            ) : filteredContacts.length === 0 ? (
              <div className="text-center py-12">
                <i className="fa-solid fa-inbox text-5xl text-slate-300 dark:text-slate-700 mb-4 inline-block"></i>
                <p className="text-slate-600 dark:text-slate-400">
                  No contacts found
                </p>
                <button
                  onClick={handleStartAddContact}
                  className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Create First Contact
                </button>
              </div>
            ) : (
              <>
                <DataTable columns={columns} data={filteredContacts} />

                {/* Pagination */}
                {totalPages > 1 && (
                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                  />
                )}
              </>
            )}
          </div>
        </div>
      </main>

      {/* Contact Modal */}
      <ContactModal
        isOpen={showModal}
        contact={editingContact}
        onClose={() => {
          setShowModal(false);
          setEditingContact(null);
        }}
        onSave={editingContact ? handleUpdateContact : handleAddContact}
        isLoading={isSaving}
      />
    </div>
  );
};

export default Contact;
