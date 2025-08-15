import React from "react";

export default function History() {
  document.title = "Order History";
  // const [orders, setOrders] = useState([]);

  if (true) {
    return (
      <div
        className="container d-flex align-items-center justify-content-center"
        style={{ minHeight: "72vh" }}
      >
        <div className="text-center">
          <h3 className="text-secondary h2">Order History</h3>
          <h3 className="text-secondary">You haven't order any thing</h3>
        </div>
      </div>
    );
  }

  return <div>History</div>;
}
