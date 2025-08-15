import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowRightFromBracket,
  faCartShopping,
  faChevronLeft,
  faChevronRight,
  faEarthAsia,
  faSearch,
  faUser,
  faPlus,
  faMinus,
  faCircleXmark,
  faTrash,
  faHeart,
  faVideoCamera,
} from "@fortawesome/free-solid-svg-icons";
import { faHeart as fasHeart } from "@fortawesome/free-regular-svg-icons";

export const ShoppingCartIcon = ({ color, size, style }) => (
  <FontAwesomeIcon
    icon={faCartShopping}
    color={color}
    size={size}
    style={style}
  />
);

export const SearchIcon = ({ color, size, style }) => (
  <FontAwesomeIcon icon={faSearch} color={color} size={size} style={style} />
);

export const EarthIcon = ({ color, size, style }) => (
  <FontAwesomeIcon icon={faEarthAsia} color={color} size={size} style={style} />
);

export const UserIcon = ({ color, size, style }) => (
  <FontAwesomeIcon icon={faUser} color={color} size={size} style={style} />
);

export const ChevronLeftIcon = ({ color, size, style }) => (
  <FontAwesomeIcon
    icon={faChevronLeft}
    color={color}
    size={size}
    style={style}
  />
);

export const ChevronRightIcon = ({ color, size, style }) => (
  <FontAwesomeIcon
    icon={faChevronRight}
    color={color}
    size={size}
    style={style}
  />
);

export const LogoutIcon = ({ color, size, style }) => (
  <FontAwesomeIcon
    icon={faArrowRightFromBracket}
    color={color}
    size={size}
    style={style}
  />
);

export const IncrementIcon = ({ color, size, style }) => (
  <FontAwesomeIcon icon={faPlus} color={color} size={size} style={style} />
);

export const DecrementIcon = ({ color, size, style }) => (
  <FontAwesomeIcon icon={faMinus} color={color} size={size} style={style} />
);

export const CircleXMarkIcon = ({ color, size, style }) => (
  <FontAwesomeIcon
    icon={faCircleXmark}
    color={color}
    size={size}
    style={style}
  />
);

export const TrashIcon = ({ color, size, style }) => (
  <FontAwesomeIcon icon={faTrash} color={color} size={size} style={style} />
);

export const HeartFillIcon = ({ color, size, style }) => (
  <FontAwesomeIcon icon={faHeart} color={color} size={size} style={style} />
);

export const HeartEmptyIcon = ({ color, size, style }) => (
  <FontAwesomeIcon icon={fasHeart} color={color} size={size} style={style} />
);

export const VideoIcon = ({ color, size, style }) => (
  <FontAwesomeIcon
    icon={faVideoCamera}
    color={color}
    size={size}
    style={style}
  />
);
