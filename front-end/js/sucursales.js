$(function () {
  let currentPage = 1;
  const pageSize = 10;
  const tablaId = "tablaSucursales";
  const paginationId = "paginationSucursales";

  const modalEl = document.getElementById("modalSucursal");
  const modal = modalEl ? new bootstrap.Modal(modalEl) : null;

  function escapeHtml(str) {
    return String(str ?? "").replace(/[&<>"'`=\/]/g, function (s) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '/': '&#x2F;', '`': '&#x60;', '=': '&#x3D;' })[s];
    });
  }

  async function cargarSucursales(page = 1) {
    const tbody = document.getElementById(tablaId);
    const placeholder = document.getElementById("placeholder-sucursal");
    try {
      const res = await fetch(`http://localhost:8080/api/sucursales?page=${page - 1}&size=${pageSize}`);
      if (!res.ok) throw new Error("Error al obtener sucursales");
      const data = await res.json();
      const items = data.content ?? data;
      const totalPages = data.totalPages ?? Math.ceil((data.length || items.length) / pageSize);

      if (!items || items.length === 0) {
        if (placeholder) {
          tbody.innerHTML = "";
          tbody.appendChild(placeholder);
          placeholder.innerHTML = `<td colspan="2" class="text-center text-muted">No hay sucursales</td>`;
        } else {
          tbody.innerHTML = `<tr><td colspan="2" class="text-center text-muted">No hay sucursales</td></tr>`;
        }
        renderPagination(totalPages, page);
        return;
      }

      tbody.innerHTML = "";
      items.forEach(s => {
        const tr = document.createElement("tr");
        tr.dataset.id = s.id ?? "";
        tr.dataset.direccion = s.direccion ?? "";

        const tdDireccion = document.createElement("td");
        tdDireccion.textContent = s.direccion ?? "";

        const tdActions = document.createElement("td");
        tdActions.innerHTML = `
          <button class="btn-action btn-edit-sucursal btn-sm me-1" data-id="${s.id}" title="Editar"><i class="fa fa-pen"></i></button>
          <button class="btn-action btn-delete-sucursal btn-sm text-danger" data-id="${s.id}" title="Eliminar"><i class="fa fa-trash"></i></button>
        `;

        tr.appendChild(tdDireccion);
        tr.appendChild(tdActions);
        tbody.appendChild(tr);
      });

      renderPagination(totalPages, page);
      attachRowListeners();
    } catch (err) {
      console.error("Error cargando sucursales:", err);
      if (placeholder) {
        const tbody = document.getElementById(tablaId);
        tbody.innerHTML = "";
        tbody.appendChild(placeholder);
        placeholder.innerHTML = `<td colspan="2" class="text-center text-danger">Error al cargar. Reintenta.</td>`;
      }
    }
  }

  function renderPagination(totalPages, activePage) {
    const pagination = document.getElementById(paginationId);
    if (!pagination) return;
    pagination.innerHTML = "";
    if (totalPages <= 1) return;

    const prevLi = document.createElement("li");
    prevLi.className = `page-item ${activePage === 1 ? "disabled" : ""}`;
    prevLi.innerHTML = `<a class="page-link" href="#">«</a>`;
    prevLi.addEventListener("click", (e) => { e.preventDefault(); if (activePage > 1) cargarSucursales(activePage - 1); });
    pagination.appendChild(prevLi);

    const maxButtons = 7;
    let start = Math.max(1, activePage - Math.floor(maxButtons / 2));
    let end = Math.min(totalPages, start + maxButtons - 1);
    if (end - start + 1 < maxButtons) start = Math.max(1, end - maxButtons + 1);

    for (let i = start; i <= end; i++) {
      const li = document.createElement("li");
      li.className = `page-item ${i === activePage ? "active" : ""}`;
      li.innerHTML = `<a class="page-link" href="#">${i}</a>`;
      li.addEventListener("click", (ev) => { ev.preventDefault(); cargarSucursales(i); });
      pagination.appendChild(li);
    }

    const nextLi = document.createElement("li");
    nextLi.className = `page-item ${activePage === totalPages ? "disabled" : ""}`;
    nextLi.innerHTML = `<a class="page-link" href="#">»</a>`;
    nextLi.addEventListener("click", (e) => { e.preventDefault(); if (activePage < totalPages) cargarSucursales(activePage + 1); });
    pagination.appendChild(nextLi);
  }

  function attachRowListeners() {
    // Delete
    document.querySelectorAll(".btn-delete-sucursal").forEach(btn => {
      btn.removeEventListener?.("click", undefined);
      btn.addEventListener("click", async (e) => {
        const id = e.currentTarget.getAttribute("data-id");
        if (!confirm("Eliminar esta sucursal?")) return;
        try {
          const res = await fetch(`http://localhost:8080/api/sucursales/${id}`, { method: "DELETE" });
          if (res.ok) cargarSucursales(currentPage);
          else alert("No se pudo eliminar");
        } catch (err) { console.error(err); alert("Error al eliminar"); }
      });
    });

    // Edit
    document.querySelectorAll(".btn-edit-sucursal").forEach(btn => {
      btn.removeEventListener?.("click", undefined);
      btn.addEventListener("click", (e) => {
        const id = e.currentTarget.getAttribute("data-id");
        const row = document.querySelector(`tr[data-id="${CSS.escape(id)}"]`);
        const direccion = row ? row.dataset.direccion : "";
        document.getElementById("sucursalId").value = id ?? "";
        document.getElementById("sucursalDireccion").value = direccion ?? "";
        if (modalEl) modalEl.querySelector(".modal-title").textContent = "Editar sucursal";
        if (modal) modal.show();
      });
    });
  }

  const form = document.getElementById("formSucursal");
  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const id = document.getElementById("sucursalId").value || null;
      const direccion = document.getElementById("sucursalDireccion").value ?? "";

      const payload = { direccion };

      try {
        const url = id ? `http://localhost:8080/api/sucursales/${encodeURIComponent(id)}` : `http://localhost:8080/api/sucursales`;
        const method = id ? "PUT" : "POST";
        const res = await fetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        if (res.ok) {
          if (modal) modal.hide();
          form.reset();
          document.getElementById("sucursalId").value = "";
          cargarSucursales(1);
        } else {
          const text = await res.text();
          console.error("Error guardando sucursal:", text);
          alert("No se pudo guardar la sucursal");
        }
      } catch (err) {
        console.error(err);
        alert("Error al guardar sucursal");
      }
    });
  }

  const btnNuevo = document.getElementById("btnNuevaSucursal");
  if (btnNuevo) {
    btnNuevo.addEventListener("click", () => {
      form.reset();
      document.getElementById("sucursalId").value = "";
      if (modalEl) modalEl.querySelector(".modal-title").textContent = "Nueva sucursal";
      if (modal) modal.show();
    });
  }

  cargarSucursales(1);
});
