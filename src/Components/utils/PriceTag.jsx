import { useCurrency } from "../Context/currencyContext";

// Price as the shopper's chosen currency. The amount is always stored in EUR;
// conversion happens here and nowhere else, so the same figure is charged.
const PriceTag = ({ amount }) => {
  const { format } = useCurrency();
  return <span>{format(amount)}</span>;
};

export default PriceTag;
