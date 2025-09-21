import React, { useState, useEffect } from "react";
import { FaEdit, FaTrash } from "react-icons/fa";
import { supabase } from "../supabaseClient";
import Swal from "sweetalert2";
import "./BrandSelector.css";

function CategorySelector() {
  const [selectedDistributor, setSelectedDistributor] = useState(null);
  const [selectedDistributorId, setSelectedDistributorId] = useState(null);
  const [categoryDetails, setCategoryDetails] = useState([]);
  const [showFormModal, setShowFormModal] = useState(false);
  const [formData, setFormData] = useState({ code: "", name: "", description: "" });
  const [distributorNames, setDistributorNames] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchCategory, setSearchCategory] = useState(""); // New state for category search

  useEffect(() => {
    let isMounted = true;

    const fetchDistributorNames = async () => {
      const { data, error } = await supabase
        .from("distributors")
        .select("id, name")
        .order("name", { ascending: true });

      if (error) {
        console.error("Error fetching distributors:", error);
        if (isMounted) setDistributorNames([]);
      } else if (isMounted) {
        setDistributorNames(data);
      }
    };

    fetchDistributorNames();

    return () => {
      isMounted = false;
    };
  }, []);

  const filteredDistributors = distributorNames.filter(({ name }) =>
    name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredCategories = categoryDetails.filter(({ name }) =>
    name.toLowerCase().includes(searchCategory.toLowerCase()) // Filter categories based on search term
  );

  const handleClick = async (distributor) => {
    setSelectedDistributor(distributor.name);
    setSelectedDistributorId(distributor.id);
    setShowFormModal(false);

    const { data, error } = await supabase
      .from("categorydetails")
      .select("code, name, description")  // remove id, use code
      .eq("principal_id", distributor.id);

    if (error) {
      console.error("Error fetching category details:", error);
      setCategoryDetails([]);
    } else {
      const formatted = data.map((item) => ({
        code: item.code,
        name: item.name,
        description: item.description || "",
      }));

      setCategoryDetails(formatted);
    }
  };

  const fetchCategoryDetailsFromSupabase = async (distributorId) => {
    try {
      const { data, error } = await supabase
        .from("categorydetails")
        .select("code, name, description")  // fetch code instead of id
        .eq("principal_id", distributorId);

      if (error) throw error;

      return data.map((item) => ({
        code: item.code,
        name: item.name,
        description: item.description,
      }));
    } catch (error) {
      console.error("Failed to fetch categories:", error);
      return [];
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      Swal.fire({
        icon: "warning",
        title: "Validation Error",
        text: "Name is required",
      });
      return;
    }

    if (!selectedDistributorId) {
      Swal.fire({
        icon: "warning",
        title: "No Distributor Selected",
        text: "Please select a distributor first.",
      });
      return;
    }

    try {
      if (formData.code) {
        // === UPDATE ===
        const { error } = await supabase
          .from("categorydetails")
          .update({
            name: formData.name,
            description: formData.description || null,
          })
          .eq("code", formData.code);  // use code instead of id

        if (error) throw error;
      } else {
        // === INSERT ===
        // Generate smart sequential code
        const { data: existingCodes, error: fetchError } = await supabase
          .from("categorydetails")
          .select("code")
          .like("code", "A%")
          .order("code", { ascending: false })
          .limit(1);

        if (fetchError) throw fetchError;

        let nextCode = "A00001";
        if (existingCodes.length > 0) {
          const lastCode = existingCodes[0].code; // e.g., A00057
          const numericPart = parseInt(lastCode.slice(1)) + 1; // 58
          nextCode = `A${numericPart.toString().padStart(5, "0")}`; // A00058
        }

        const { error } = await supabase
          .from("categorydetails")
          .insert({
            code: nextCode,
            name: formData.name,
            description: formData.description || null,
            principal_id: selectedDistributorId,
            parentname: selectedDistributor,
          });

        if (error) throw error;
      }

      setShowFormModal(false);
      setFormData({ code: "", name: "", description: "" });

      const newDetails = await fetchCategoryDetailsFromSupabase(selectedDistributorId);
      setCategoryDetails(newDetails);

      Swal.fire({
        icon: "success",
        title: "Success",
        text: "Category saved successfully!",
        timer: 1500,
        showConfirmButton: false,
      });
    } catch (error) {
      console.error("Save failed:", error);
      Swal.fire({
        icon: "error",
        title: "Save Failed",
        text: error.message || "Unknown error",
      });
    }
  };

  const handleDelete = async (code) => {
    const result = await Swal.fire({
      title: "Are you sure?",
      text: "Do you really want to delete this category?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Yes, delete it!",
    });

    if (result.isConfirmed) {
      try {
        const { error } = await supabase
          .from("categorydetails")
          .delete()
          .eq("code", code);  // use code for deletion

        if (error) throw error;

        setCategoryDetails((prev) => prev.filter((item) => item.code !== code));

        Swal.fire({
          icon: "success",
          title: "Deleted!",
          text: "Category has been deleted.",
          timer: 1500,
          showConfirmButton: false,
        });
      } catch (error) {
        console.error("Delete failed:", error);
        Swal.fire({
          icon: "error",
          title: "Delete Failed",
          text: error.message || "Unknown error",
        });
      }
    }
  };

  const openFormModal = (existing = null) => {
    if (existing) {
      setFormData({ ...existing });
    } else {
      setFormData({ code: "", name: "", description: "" });
    }
    setShowFormModal(true);
  };

  const closeModal = () => {
    setSelectedDistributor(null);
    setSelectedDistributorId(null);
    setShowFormModal(false);
    setCategoryDetails([]);
  };

  return (
    <div className="brand-selector-wrapper">
      <div className="brand-grid-container">
        <h1 className="brand-header">Accounts</h1>

        <input
          type="text"
          placeholder="Search distributors..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            width: "100%",
            padding: "10px",
            marginBottom: "15px",
            fontSize: "16px",
            borderRadius: "6px",
            border: "1px solid #ccc",
          }}
          aria-label="Search distributors"
        />

        <div className="brand-grid">
          {filteredDistributors.length === 0 ? (
            <p>No distributors found</p>
          ) : (
            filteredDistributors.map(({ id, name }) => (
              <button
                key={id}
                className={`brand-card ${selectedDistributor === name ? "selected" : ""}`}
                onClick={() => handleClick({ id, name })}
              >
                {name}
              </button>
            ))
          )}
        </div>
      </div>

      {selectedDistributor ? (
        <div className="brand-modal rotate-in">
          <button className="close-btn" onClick={closeModal}>
            &times;
          </button>
          <h2>Accounts: {selectedDistributor}</h2>

          <button className="btn-add-new" onClick={() => openFormModal()}>
            Add Category
          </button>
          <input
            type="text"
            placeholder="Search categories..."
            value={searchCategory}
            onChange={(e) => setSearchCategory(e.target.value)}
            style={{
              width: "100%",
              padding: "8px",
              fontSize: "14px",
         
              borderRadius: "6px",
              border: "1px solid #ccc",
            }}
          />
          <div style={tableWrapperStyle}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>Name</th>
                  <th style={thStyle}>Description</th>
                  <th style={thStyle}>Actions</th>
                </tr>
              </thead>
              <tbody>

                {filteredCategories.length === 0 ? (
                  <tr>
                    <td style={{ ...tdStyle, textAlign: "center" }} colSpan={3}>
                      No categories found
                    </td>
                  </tr>
                ) : (
                  filteredCategories.map((item) => (
                    <tr
                      key={item.code}
                      style={{ cursor: "default" }}
                      onMouseEnter={(e) => {
                        Object.assign(e.currentTarget.style, rowHoverStyle);
                      }}
                      onMouseLeave={(e) => {
                        Object.assign(e.currentTarget.style, {
                          backgroundColor: tdStyle.backgroundColor,
                          boxShadow: tdStyle.boxShadow,
                        });
                      }}
                    >
                      <td style={tdStyle}>{item.name}</td>
                      <td style={tdStyle}>{item.description}</td>
                      <td style={tdStyle}>
                        <button
                          onClick={() => openFormModal(item)}
                          aria-label={`Edit ${item.name}`}
                          title="Edit"
                          style={editButtonStyle}
                        >
                          <FaEdit style={{ fontSize: 20 }} />
                        </button>

                        <button
                          onClick={() => handleDelete(item.code)}
                          aria-label={`Delete ${item.name}`}
                          title="Delete"
                          style={deleteButtonStyle}
                        >
                          <FaTrash style={{ fontSize: 20 }} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {showFormModal && (
            <div className="DistriModal-overlay">
              <form className="DistriModal-content" onSubmit={handleSave}>
                <h3>{formData.code ? "Edit Category" : "Add Category"}</h3>

                <label htmlFor="name">Name</label>
                <input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                />

                <label htmlFor="description">Description</label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={3}
                />

                <div className="form-buttons">
                  <button type="submit" className="btn-save">
                    Save
                  </button>
                  <button
                    type="button"
                    className="btn-cancel"
                    onClick={() => setShowFormModal(false)}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      ) : (
        <p>Please select a distributor to view categories.</p>
      )}
    </div>
  );
}

export default CategorySelector;

const tableWrapperStyle = {
  overflowX: "auto",
  marginTop: 20,
  borderRadius: 8,
  boxShadow: "0 8px 20px rgba(0,0,0,0.1)",
  background: "#fff",
  padding: 15,
  fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
};

const tableStyle = {
  width: "100%",
  borderCollapse: "separate",
  borderSpacing: "0 12px",
};

const thStyle = {
  padding: "12px 15px",
  textAlign: "left",
  fontWeight: 500,
  fontSize: 16,
  color: "#f7f7f7ff",
  backgroundColor: "#0087c5ff",
  borderBottom: "2px solid #ddd",
};

const tdStyle = {
  padding: "12px 15px",
  textAlign: "left",
  fontWeight: 500,
  fontSize: 16,
  color: "#333",
  backgroundColor: "#fafafa",
  borderBottom: "1px solid #eee",
  borderRadius: 0,
  boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
  transition: "background-color 0.3s ease, box-shadow 0.3s ease",
};

const rowHoverStyle = {
  backgroundColor: "#e6f7ff",
  boxShadow: "0 4px 12px rgba(0, 127, 255, 0.15)",
};

const buttonBaseStyle = {
  background: "transparent",
  border: "none",
  cursor: "pointer",
  padding: "6px 10px",
  marginLeft: 8,
  borderRadius: 6,
  transition: "all 0.25s ease",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  outline: "none",
};

const editButtonStyle = {
  ...buttonBaseStyle,
  color: "orange",
};

const deleteButtonStyle = {
  ...buttonBaseStyle,
  color: "#d32f2f",
};
