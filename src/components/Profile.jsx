import React, { useState, useEffect, useRef } from "react";
import { useUser, useClerk } from "@clerk/clerk-react";
import { apiService } from "../services/api";
import toast from "react-hot-toast";
import Breadcrumb from "./Breadcrumb";

const Profile = () => {
  const { user: clerkUser } = useUser();
  const { signOut } = useClerk();
  const [profileData, setProfileData] = useState({
    fullName: "",
    email: "",
    phoneNumber: "",
    department: "",
    jobTitle: "",
    bio: "",
    profilePicture: null,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [picturePreview, setPicturePreview] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        setLoading(true);
        const response = await apiService.user.getProfile(clerkUser?.id);

        if (response.data.success) {
          const userData = response.data.data;
          setProfileData({
            fullName: userData.fullName || clerkUser?.fullName || "",
            email:
              userData.email ||
              clerkUser?.primaryEmailAddress?.emailAddress ||
              "",
            phoneNumber: userData.phoneNumber || "",
            department: userData.department || "",
            jobTitle: userData.jobTitle || "",
            bio: userData.bio || "",
            profilePicture: userData.profilePicture || null,
          });

          if (userData.profilePicture) {
            setPicturePreview(userData.profilePicture);
          }
        } else {
          // If profile doesn't exist, initialize with Clerk data
          const userData = {
            clerkId: clerkUser?.id,
            email: clerkUser?.primaryEmailAddress?.emailAddress,
            fullName: clerkUser?.fullName,
            phoneNumber: "",
            department: "",
            jobTitle: "",
            bio: "",
          };

          // Create initial profile
          await apiService.user.createOrUpdateProfile(userData);
          setProfileData({
            fullName: clerkUser?.fullName || "",
            email: clerkUser?.primaryEmailAddress?.emailAddress || "",
            phoneNumber: "",
            department: "",
            jobTitle: "",
            bio: "",
            profilePicture: null,
          });
        }
      } catch (error) {
        console.error("Error fetching profile:", error);
        toast.error("Failed to load profile");
      } finally {
        setLoading(false);
      }
    };

    if (clerkUser?.id) {
      fetchUserProfile();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clerkUser?.id]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setProfileData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleProfilePictureChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image size must be less than 5MB");
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPicturePreview(reader.result);
    };
    reader.readAsDataURL(file);

    // For now, we'll store the data URL
    // In production, you might want to upload to cloud storage
    setProfileData((prev) => ({
      ...prev,
      profilePicture: reader.result,
    }));
  };

  const handleSaveProfile = async () => {
    try {
      if (!profileData.fullName || !profileData.email) {
        toast.error("Full name and email are required");
        return;
      }

      setSaving(true);

      // Update profile
      const updateData = {
        fullName: profileData.fullName,
        email: profileData.email,
        phoneNumber: profileData.phoneNumber,
        department: profileData.department,
        jobTitle: profileData.jobTitle,
        bio: profileData.bio,
      };

      await apiService.user.updateProfile(clerkUser?.id, updateData);

      // Upload profile picture if changed
      if (picturePreview && profileData.profilePicture) {
        await apiService.user.uploadProfilePicture(clerkUser?.id, {
          pictureUrl: picturePreview,
        });
      }

      toast.success("Profile updated successfully");
      // Reload the page to reflect changes
      window.location.reload();
    } catch (error) {
      console.error("Error saving profile:", error);
      toast.error("Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Breadcrumb
        items={[
          { label: "Home", href: "/home", icon: "fa-house" },
          { label: "Profile", icon: "fa-user" },
        ]}
      />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-lg shadow-md">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-10">
            <h1 className="text-3xl font-bold text-white">My Profile</h1>
            <p className="text-blue-100 mt-2">
              Manage your account settings and preferences
            </p>
          </div>

          {/* Profile Content */}
          <div className="px-8 py-10">
            <div className="space-y-8">
              {/* Profile Picture Section */}
              <div className="flex items-center gap-8">
                <div className="flex-shrink-0">
                  {picturePreview ? (
                    <img
                      src={picturePreview}
                      alt="Profile"
                      className="h-24 w-24 rounded-full object-cover border-4 border-blue-200"
                    />
                  ) : (
                    <div className="h-24 w-24 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-3xl font-bold">
                      {profileData.fullName.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Profile Picture
                  </h3>
                  <p className="text-gray-600 text-sm mb-4">
                    JPG, PNG or GIF (Max 5MB)
                  </p>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Change Picture
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleProfilePictureChange}
                    className="hidden"
                  />
                </div>
              </div>

              <hr className="border-gray-200" />

              {/* Form Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Full Name */}
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    name="fullName"
                    value={profileData.fullName}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Your full name"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Email *
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={profileData.email}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="your@email.com"
                  />
                </div>

                {/* Phone Number */}
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    name="phoneNumber"
                    value={profileData.phoneNumber}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="+1 (555) 000-0000"
                  />
                </div>

                {/* Department */}
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Department
                  </label>
                  <input
                    type="text"
                    name="department"
                    value={profileData.department}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Human Resources"
                  />
                </div>

                {/* Job Title */}
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Job Title
                  </label>
                  <input
                    type="text"
                    name="jobTitle"
                    value={profileData.jobTitle}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., HR Manager"
                  />
                </div>
              </div>

              {/* Bio */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Bio
                </label>
                <textarea
                  name="bio"
                  value={profileData.bio}
                  onChange={handleInputChange}
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Tell us about yourself..."
                />
              </div>

              <hr className="border-gray-200" />

              {/* Action Buttons */}
              <div className="flex gap-4 justify-end">
                <button
                  onClick={() => window.history.back()}
                  disabled={saving}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveProfile}
                  disabled={saving}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {saving ? (
                    <>
                      <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <i className="fa-solid fa-save"></i>
                      Save Changes
                    </>
                  )}
                </button>
              </div>

              {/* Account Section */}
              <div className="pt-8 border-t border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Account
                </h3>
                <button
                  onClick={() => signOut()}
                  className="px-4 py-2 text-red-600 border border-red-600 rounded-lg hover:bg-red-50 transition-colors"
                >
                  <i className="fa-solid fa-sign-out mr-2"></i>
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
