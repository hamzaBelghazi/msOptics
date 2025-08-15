import { useCurrency } from "../Context/currencyContext";

const PriceTag = ({ amount }) => {
  const { currency, convert } = useCurrency();
  const convertedAmount = convert(amount);

  return (
    <span>
      {new Intl.NumberFormat("en", {
        style: "currency",
        currency,
      }).format(convertedAmount)}
    </span>
  );
};

export default PriceTag;
