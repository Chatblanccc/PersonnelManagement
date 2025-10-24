from __future__ import annotations

from typing import Iterable, Sequence

from sqlalchemy import select
from sqlalchemy.exc import ProgrammingError
from sqlalchemy.orm import Session

from app.models.contract_field_config import ContractFieldConfig
from app.schemas.field_config import FieldConfigCreate, FieldConfigUpdate
from app.utils.field_defaults import DEFAULT_FIELD_CONFIGS
from app.database import Base


class FieldConfigService:
    @staticmethod
    def list_configs(db: Session) -> Sequence[ContractFieldConfig]:
        stmt = select(ContractFieldConfig).order_by(
            ContractFieldConfig.group,
            ContractFieldConfig.order_index,
            ContractFieldConfig.label,
        )
        try:
            results = db.scalars(stmt).all()
        except ProgrammingError:
            db.rollback()
            Base.metadata.create_all(bind=db.get_bind())
            FieldConfigService.bootstrap_defaults(db)
            results = db.scalars(stmt).all()
        if not results:
            FieldConfigService.bootstrap_defaults(db)
            results = db.scalars(stmt).all()
        return results

    @staticmethod
    def get_by_key(db: Session, key: str) -> ContractFieldConfig | None:
        stmt = select(ContractFieldConfig).where(ContractFieldConfig.key == key)
        return db.scalars(stmt).first()

    @staticmethod
    def create_config(db: Session, payload: FieldConfigCreate) -> ContractFieldConfig:
        existing = FieldConfigService.get_by_key(db, payload.key)
        if existing:
            raise ValueError("Field key already exists")

        config = ContractFieldConfig(
            key=payload.key,
            label=payload.label,
            group=payload.group,
            type=payload.type,
            width=payload.width,
            editable=payload.editable,
            required=payload.required,
            fixed=payload.fixed,
            options=payload.options,
            description=payload.description,
            order_index=payload.order_index or 1000,
            is_custom=payload.is_custom,
        )
        db.add(config)
        db.commit()
        db.refresh(config)
        return config

    @staticmethod
    def update_config(db: Session, key: str, payload: FieldConfigUpdate) -> ContractFieldConfig:
        config = FieldConfigService.get_by_key(db, key)
        if not config:
            raise ValueError("Field config not found")

        for attr, value in payload.dict(exclude_unset=True).items():
            setattr(config, attr, value)

        db.add(config)
        db.commit()
        db.refresh(config)
        return config

    @staticmethod
    def delete_config(db: Session, key: str) -> None:
        config = FieldConfigService.get_by_key(db, key)
        if not config:
            raise ValueError("Field config not found")

        if not config.is_custom:
            raise ValueError("Built-in fields cannot be deleted")

        db.delete(config)
        db.commit()

    @staticmethod
    def export_field_pairs(db: Session) -> list[tuple[str, str]]:
        configs = FieldConfigService.list_configs(db)
        return [(config.key, config.label) for config in configs]

    @staticmethod
    def bulk_upsert(db: Session, configs: Iterable[FieldConfigCreate]) -> Sequence[ContractFieldConfig]:
        result = []
        for item in configs:
            existing = FieldConfigService.get_by_key(db, item.key)
            if existing:
                for attr, value in item.dict(exclude_unset=True).items():
                    setattr(existing, attr, value)
                db.add(existing)
                result.append(existing)
            else:
                new_config = ContractFieldConfig(**item.dict())
                db.add(new_config)
                result.append(new_config)
        db.commit()
        for config in result:
            db.refresh(config)
        return result

    @staticmethod
    def bootstrap_defaults(db: Session) -> None:
        existing_keys = {
            key
            for (key,) in db.execute(select(ContractFieldConfig.key))
        }
        for order_index, item in enumerate(DEFAULT_FIELD_CONFIGS, start=1):
            if item["key"] in existing_keys:
                continue
            config = ContractFieldConfig(
                key=item["key"],
                label=item["label"],
                group=item["group"],
                type=item.get("type", "text"),
                width=item.get("width"),
                editable=item.get("editable", True),
                required=item.get("required", False),
                fixed=item.get("fixed", False),
                options=item.get("options"),
                description=item.get("description"),
                order_index=item.get("order_index", 1000 + order_index),
                is_custom=False,
            )
            db.add(config)
        db.commit()

