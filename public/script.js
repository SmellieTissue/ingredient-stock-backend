document.addEventListener("DOMContentLoaded", () => {
  fetch("data.json")
    .then((response) => response.json())
    .then((data) => {
      renderTables(data);
      setupSearch(data);
    });

  function renderTables(data) {
    const container = document.getElementById("ingredientTables");
    container.innerHTML = "";

    data.forEach((categoryData, categoryIndex) => {
      const section = document.createElement("section");
      const title = document.createElement("h2");
      title.textContent = categoryData.category;
      section.appendChild(title);

      const table = document.createElement("table");
      const thead = document.createElement("thead");
      thead.innerHTML = `
        <tr>
          <th>วัตถุดิบ</th>
          <th>หน่วย</th>
          <th>ตั้งต้น</th>
          <th>ใช้ไป</th>
          <th>คงเหลือ</th>
          <th>สั่งซื้อ</th>
        </tr>
      `;
      table.appendChild(thead);

      const tbody = document.createElement("tbody");

      categoryData.ingredients.forEach((item, itemIndex) => {
        const row = document.createElement("tr");

        const nameCell = document.createElement("td");
        nameCell.textContent = item.name;
        const unitCell = document.createElement("td");
        unitCell.textContent = item.unit;

        const startCell = document.createElement("td");
        startCell.appendChild(createField("start", categoryIndex, itemIndex, item.start));

        const usedCell = document.createElement("td");
        usedCell.appendChild(createField("used", categoryIndex, itemIndex, item.used));

        const remainingCell = document.createElement("td");
        remainingCell.id = `remaining-${categoryIndex}-${itemIndex}`;
        remainingCell.textContent = item.start - item.used;

        const orderCell = document.createElement("td");
        orderCell.appendChild(createField("order", categoryIndex, itemIndex, item.purchase || 0));

        row.appendChild(nameCell);
        row.appendChild(unitCell);
        row.appendChild(startCell);
        row.appendChild(usedCell);
        row.appendChild(remainingCell);
        row.appendChild(orderCell);

        tbody.appendChild(row);
      });

      table.appendChild(tbody);
      section.appendChild(table);
      container.appendChild(section);
    });
  }

  function createField(type, catIdx, itemIdx, initialValue) {
    const container = document.createElement("div");
    container.className = "field-cell";

    const input = document.createElement("input");
    input.type = "number";
    input.min = "0";
    input.value = initialValue;
    input.style.width = "50px";
    input.id = `${type}-${catIdx}-${itemIdx}`;

    const plus = document.createElement("button");
    plus.textContent = "+";
    plus.onclick = () => {
      input.value = Number(input.value) + 1;
      updateRemaining(catIdx, itemIdx);
    };

    const minus = document.createElement("button");
    minus.textContent = "-";
    minus.onclick = () => {
      if (Number(input.value) > 0) {
        input.value = Number(input.value) - 1;
        updateRemaining(catIdx, itemIdx);
      }
    };

    input.addEventListener("input", () => updateRemaining(catIdx, itemIdx));

    container.appendChild(minus);
    container.appendChild(input);
    container.appendChild(plus);
    return container;
  }

  function updateRemaining(catIdx, itemIdx) {
    const start = Number(document.getElementById(`start-${catIdx}-${itemIdx}`).value);
    const used = Number(document.getElementById(`used-${catIdx}-${itemIdx}`).value);
    const remaining = start - used;
    const remainingCell = document.getElementById(`remaining-${catIdx}-${itemIdx}`);
    if (remainingCell) {
      remainingCell.textContent = remaining;
    }
  }

  function setupSearch(data) {
    const searchInput = document.getElementById("searchInput");
    searchInput.addEventListener("input", () => {
      const keyword = searchInput.value.toLowerCase();
      const sections = document.querySelectorAll("#ingredientTables section");

      sections.forEach((section, sectionIndex) => {
        const rows = section.querySelectorAll("tbody tr");
        let hasMatch = false;

        rows.forEach((row, rowIndex) => {
          const name = data[sectionIndex]?.ingredients?.[rowIndex]?.name?.toLowerCase() || "";
          const isMatch = name.includes(keyword);
          row.style.display = isMatch ? "" : "none";
          if (isMatch) hasMatch = true;
        });

        section.style.display = hasMatch || keyword === "" ? "" : "none";
      });
    });
  }

  // 🟢 เพิ่มปุ่มบันทึก
  const saveButton = document.createElement("button");
  saveButton.textContent = "บันทึก";
  saveButton.id = "saveButton";
  saveButton.style.position = "fixed";
  saveButton.style.bottom = "20px";
  saveButton.style.left = "50%";
  saveButton.style.transform = "translateX(-50%)";
  saveButton.style.padding = "10px 20px";
  saveButton.style.fontSize = "16px";
  saveButton.style.zIndex = "1000";
  document.body.appendChild(saveButton);

  // ✅ เมื่อกดบันทึก ส่งข้อมูลไป backend พร้อมชื่อผู้ใช้งาน
  saveButton.addEventListener("click", () => {
    const username = prompt("กรุณาใส่ชื่อผู้ปรับวัตถุดิบ");
    if (!username) {
      alert("ต้องระบุชื่อผู้ใช้งานก่อนบันทึก");
      return;
    }

    const tables = document.querySelectorAll("#ingredientTables section");
    const dataToSave = [];

    tables.forEach((section, catIdx) => {
      const title = section.querySelector("h2").textContent;
      const rows = section.querySelectorAll("tbody tr");
      const ingredients = [];

      rows.forEach((row, itemIdx) => {
        const name = row.cells[0].textContent;
        const unit = row.cells[1].textContent;
        const start = Number(document.getElementById(`start-${catIdx}-${itemIdx}`).value);
        const used = Number(document.getElementById(`used-${catIdx}-${itemIdx}`).value);
        const remaining = start - used;
        const order = Number(document.getElementById(`order-${catIdx}-${itemIdx}`).value);

        ingredients.push({ name, unit, start, used, remaining, purchase: order });
      });

      dataToSave.push({ category: title, ingredients });
    });

    fetch("/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        data: dataToSave,
        username: username
      })
    })
      .then((res) => res.text())
      .then((msg) => {
        alert("✅ บันทึกสำเร็จ: " + msg);
      })
      .catch((err) => {
        alert("❌ เกิดข้อผิดพลาดในการบันทึก");
        console.error(err);
      });
  });
});