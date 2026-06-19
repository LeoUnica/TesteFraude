import uuid
import json
from datetime import datetime
from typing import Annotated, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
from ...database import get_db
from ...models.product import Product
from ...core.audit import audit_log
from ...api.deps import get_current_user
from ...models.user import User

router = APIRouter(prefix="/products", tags=["products"])


class ProductCreate(BaseModel):
    code: str
    name: str
    status: str = "ativo"
    bank_id: Optional[str] = None
    convenio_id: Optional[str] = None
    description: Optional[str] = None


class ProductUpdate(BaseModel):
    code: Optional[str] = None
    name: Optional[str] = None
    status: Optional[str] = None
    bank_id: Optional[str] = None
    convenio_id: Optional[str] = None
    description: Optional[str] = None


def product_to_dict(p: Product) -> dict:
    return {
        "id": p.id,
        "code": p.code,
        "name": p.name,
        "status": p.status,
        "bank_id": p.bank_id,
        "convenio_id": p.convenio_id,
        "description": p.description,
        "created_at": p.created_at.isoformat() if p.created_at else None,
        "updated_at": p.updated_at.isoformat() if p.updated_at else None,
        "created_by": p.created_by,
    }


@router.get("/")
async def list_products(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
    bank_id: Optional[str] = None,
    convenio_id: Optional[str] = None,
    status_filter: Optional[str] = Query(None, alias="status"),
):
    query = db.query(Product)
    if bank_id:
        query = query.filter(Product.bank_id == bank_id)
    if convenio_id:
        query = query.filter(Product.convenio_id == convenio_id)
    if status_filter:
        query = query.filter(Product.status == status_filter)
    products = query.order_by(Product.name).all()
    return [product_to_dict(p) for p in products]


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_product(
    body: ProductCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    existing = db.query(Product).filter(Product.code == body.code).first()
    if existing:
        raise HTTPException(status_code=400, detail="Código já cadastrado")

    product = Product(
        id=str(uuid.uuid4()),
        code=body.code,
        name=body.name,
        status=body.status,
        bank_id=body.bank_id,
        convenio_id=body.convenio_id,
        description=body.description,
        created_by=current_user.id,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    db.add(product)
    db.commit()
    db.refresh(product)

    audit_log(
        db, current_user.id, current_user.name,
        "CREATE_PRODUCT", "products", entity_id=product.id, entity_type="Product",
        new_value=json.dumps({"name": product.name, "code": product.code}),
    )

    return product_to_dict(product)


@router.put("/{product_id}")
async def update_product(
    product_id: str,
    body: ProductUpdate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Produto não encontrado")

    old_data = product_to_dict(product)

    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(product, field, value)
    product.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(product)

    audit_log(
        db, current_user.id, current_user.name,
        "UPDATE_PRODUCT", "products", entity_id=product.id, entity_type="Product",
        old_value=json.dumps(old_data), new_value=json.dumps(product_to_dict(product)),
    )

    return product_to_dict(product)


@router.delete("/{product_id}")
async def delete_product(
    product_id: str,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Produto não encontrado")

    db.delete(product)
    db.commit()

    audit_log(
        db, current_user.id, current_user.name,
        "DELETE_PRODUCT", "products", entity_id=product_id, entity_type="Product",
    )

    return {"message": "Produto excluído com sucesso"}
