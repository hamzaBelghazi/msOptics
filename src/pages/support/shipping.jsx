import React from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

export default function Shipping() {
  document.title = "Shipping and Delivery";
  const { t } = useTranslation();
  return (
    <div className="container-fluid my-5">
      <div className="row justify-content-center align-items-center">
        <div className="col-10 col-md-9">
          <div class="shipping_img garantie_img text-center">
            <img
              src={`${process.env.REACT_APP_SERVER_URL}/assets/ship.svg`}
              alt="shipping"
              width={250}
            />
          </div>
          <div class="garantie_info shipping_info">
            <h1 className="text-center">{t("shipping_and_delevry")}</h1>
            <p>{t("shipping_parag_one")}</p>
            <p>{t("shipping_parag_two")}</p>
            <div class="alert alert-primary text-secondary">
              <p className="p-0 m-0">{t("shipping_remarque")}</p>
            </div>
            <p>{t("shipping_parag_three")}</p>
            <p>{t("shipping_parag_fore")}</p>
            <p>
              {t("shipping_parag_five")}{" "}
              <Link className="link-blue" to="/">
                {t("tos")}{" "}
              </Link>
              .
            </p>
            <h3>{t("dod_term")}</h3>
            <p>{t("shipping_parag_six")}</p>
            <p>{t("shipping_parag_seven")}</p>
            <h4>{t("produce")}</h4>
            <ul>
              <li>{t("stage1")}</li>
              <li>{t("stage2")}</li>
              <li>{t("stage3")}</li>
              <li>{t("stage4")}</li>
              <li>{t("stage5")}</li>
            </ul>
            <h3>{t("more_days")}</h3>
            <ul>
              <li>{t("delevery")}</li>
              <li>{t("shipping_time")}</li>
            </ul>
            <p>
              {t("shipping_parag_eate")}{" "}
              <Link className="link-blue" to="/">
                {t("tos")}{" "}
              </Link>{" "}
              )
            </p>
            <p>{t("shippping_parag_nine")}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
