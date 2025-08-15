import React from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

export default function Return() {
  document.title = "Return Policy";
  const { t } = useTranslation();
  return (
    <div className="container-fluid my-5">
      <div className="row justify-content-center align-items-center">
        <div className="col-10 col-md-9">
          <div class="return_img text-center">
            <img
              src={`${process.env.REACT_APP_SERVER_URL}/assets/return.svg`}
              alt="returns"
              width={250}
            />
          </div>
          <div class="return_info">
            <h1 className="text-center">{t("returns_title")}</h1>
            <p class="notice">{t("notice_1")}</p>
            <p class="notice">{t("notice_2")}</p>

            <div class="alert alert-danger">
              <p>
                {t("remaque_start")}{" "}
                <a href="mailto:support@mhsoptics.be" className="link-blue">
                  support@mhsoptics.be
                </a>
                . Any {t("remarque_end")}{" "}
                <Link className="link-blue" to="#">
                  {" "}
                  {t("tos")}{" "}
                </Link>{" "}
                .
              </p>
            </div>
            <h3>What is covered by the 2 year warranty?</h3>
            <table className="table table-primary my-3">
              <thead>
                <tr>
                  <th scope="col"></th>
                  <th scope="col">✔ {t("covered")}</th>
                  <th scope="col">✘ {t("uncovered")}</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>{t("glasses")}</td>
                  <td>{t("covered_glasses")}</td>
                  <td>{t("uncovered_glasses")}</td>
                </tr>
                <tr>
                  <td>{t("frames")}</td>
                  <td>{t("covered_frames")}</td>
                  <td>{t("uncovered_frames")}</td>
                </tr>
              </tbody>
            </table>
            <p>{t("paragh")}</p>
            <div class="alert alert-primary text-secondary">
              <p>
                {t("remarque_Lite_start")}{" "}
                <a href="mailto:support@mhsoptics.be" className="link-blue">
                  support@mhsoptics.be
                </a>
                .{t("remarque_Lite_end")}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
